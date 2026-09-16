import { BloomFilter } from './BloomFilter';
import { LRUCache } from './LRUCache';
import { GraphFraudAnalyzer } from './GraphFraudAnalyzer';
import { ICacheService } from '../interfaces/ICacheService';
import { IMessageBroker } from '../interfaces/IMessageBroker';
import { IAIService } from '../interfaces/IAIService';
import { MetricsService } from '../../infrastructure/telemetry/MetricsService';

import { DynamicFraudRulesEngine } from './DynamicFraudRulesEngine';

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    timestamp: number;
    deviceId: string;
    recipientId: string;
}

export interface FraudAlert {
    transactionId: string;
    riskScore: number;
    reason: string;
    aiExplanation?: string;
    isBlocked: boolean;
    detectedBy: string;
}

export class FraudDetectionEngine {
    private readonly PAIR_THRESHOLD = 10_000;
    private readonly TIME_WINDOW_SEC = 300; 

    private bloomFilter = new BloomFilter(1_000_000, 0.001);
    private lruCache = new LRUCache<string, boolean>(10_000);
    private graphAnalyzer = new GraphFraudAnalyzer();
    private rulesEngine = new DynamicFraudRulesEngine();

    constructor(
        private readonly cache: ICacheService,
        private readonly broker: IMessageBroker,
        private readonly aiService: IAIService,
        private readonly metrics: MetricsService
    ) {}

    public async analyzeTransaction(tx: Transaction): Promise<FraudAlert | null> {
        const timer = this.metrics.processingLatency.startTimer();
        this.metrics.transactionsProcessed.inc();

        try {
            // ── L0: Dynamic Business Rules ───────────────────────────────
            const ruleResults = await this.rulesEngine.evaluate(tx);
            if (ruleResults.length > 0) {
                const highestRisk = ruleResults.reduce((prev, current) => 
                    (prev.score || 0) > (current.score || 0) ? prev : current
                );
                
                return await this.raiseAlert({
                    transactionId: tx.id,
                    riskScore: highestRisk.score || 80,
                    reason: `Business Rule Triggered: ${highestRisk.reason}`,
                    isBlocked: (highestRisk.score || 0) >= 90,
                    detectedBy: 'DynamicRulesEngine'
                });
            }

            const dupKey = `${tx.userId}:${tx.amount}:${tx.recipientId}`;

            // ── L1: Bloom Filter ──────────────────────────────────────────
            // Fast probabilistic check — if returns false, DEFINITELY not a dupe.
            // Saves Redis round-trip for 99.9% of clean transactions.
            if (!this.bloomFilter.mightContain(dupKey)) {
                this.bloomFilter.add(dupKey);
                // Fall through to deeper checks
            } else {
                // ── L2: LRU Cache ─────────────────────────────────────────
                // Bloom said "maybe dupe" — confirm with exact in-process LRU
                if (this.lruCache.get(dupKey) === true) {
                    return await this.raiseAlert({
                        transactionId: tx.id,
                        riskScore: 99,
                        reason: `Duplicate payment blocked by L1/L2 cache layer (Bloom + LRU).`,
                        isBlocked: true,
                        detectedBy: 'BloomFilter+LRU'
                    });
                }

                // ── L3: Redis Distributed Sliding Window ──────────────────
                const redisKey = `dup:${dupKey}`;
                const exists = await this.cache.has(redisKey);
                if (exists) {
                    this.lruCache.put(dupKey, true); // Promote to L2
                    return await this.raiseAlert({
                        transactionId: tx.id,
                        riskScore: 99,
                        reason: `Duplicate payment detected across distributed nodes via Redis.`,
                        isBlocked: true,
                        detectedBy: 'Redis'
                    });
                }
                await this.cache.set(redisKey, '1', this.TIME_WINDOW_SEC);
                this.lruCache.put(dupKey, true);
                this.bloomFilter.add(dupKey);
            }

            // ── "Two Sum" Suspicious Pair Detection ───────────────────────
            const historyKey = `history:${tx.userId}`;
            const rawHistory = await this.cache.getList(historyKey);
            const history: Transaction[] = rawHistory.map(r => JSON.parse(r));

            const complement = this.PAIR_THRESHOLD - tx.amount;
            const pairMap = new Map<number, Transaction>();
            for (const past of history) pairMap.set(past.amount, past);

            if (pairMap.has(complement)) {
                const paired = pairMap.get(complement)!;
                const aiExplanation = await this.aiService.generateFraudExplanation(tx, paired);
                return await this.raiseAlert({
                    transactionId: tx.id,
                    riskScore: 95,
                    reason: `AML Structuring detected. Paired with Tx ${paired.id} hits $${this.PAIR_THRESHOLD} threshold.`,
                    aiExplanation,
                    isBlocked: true,
                    detectedBy: 'TwoSumSlidingWindow'
                });
            }

            // ── L4: Graph Cycle Detection (Circular Money Mule Ring) ──────
            this.graphAnalyzer.addTransaction(tx.userId, tx.recipientId);
            const cycleResult = this.graphAnalyzer.detectCycle(tx.userId);
            if (cycleResult.detected) {
                return await this.raiseAlert({
                    transactionId: tx.id,
                    riskScore: 98,
                    reason: `Circular transfer ring detected: ${cycleResult.cycle?.join(' → ')}`,
                    isBlocked: true,
                    detectedBy: 'GraphDFS'
                });
            }

            // ── Velocity Check ─────────────────────────────────────────────
            await this.cache.pushToList(historyKey, JSON.stringify(tx));
            await this.cache.expire(historyKey, this.TIME_WINDOW_SEC);

            if (history.length >= 10) {
                return await this.raiseAlert({
                    transactionId: tx.id,
                    riskScore: 90,
                    reason: `Velocity anomaly: ${history.length} transactions in 5 min window.`,
                    isBlocked: true,
                    detectedBy: 'VelocityCheck'
                });
            }

            return null; // Clean transaction

        } finally {
            timer();
        }
    }

    private async raiseAlert(alert: FraudAlert): Promise<FraudAlert> {
        this.metrics.fraudAlertsGenerated.inc();
        await this.broker.publish('fraud-alerts', alert);
        return alert;
    }
}

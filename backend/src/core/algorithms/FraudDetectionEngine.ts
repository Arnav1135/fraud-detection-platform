import { ICacheService } from '../interfaces/ICacheService';
import { IMessageBroker } from '../interfaces/IMessageBroker';

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
    isBlocked: boolean;
}

/**
 * FraudDetectionEngine (SDE-3 Upgraded)
 * 
 * Demonstrates:
 * 1. Clean Architecture (Use Cases / Core Logic isolated from Infrastructure)
 * 2. Dependency Injection (ICacheService, IMessageBroker)
 * 3. O(1) Redis-backed Sliding Window & Duplicate Detection
 */
export class FraudDetectionEngine {
    private readonly SUSPICIOUS_PAIR_THRESHOLD = 10000;
    private readonly TIME_WINDOW_SEC = 5 * 60; // 5 minutes

    constructor(
        private readonly cache: ICacheService,
        private readonly broker: IMessageBroker
    ) {}

    /**
     * Process a transaction stream.
     * Uses async operations to talk to the distributed cache (Redis).
     */
    public async analyzeTransaction(tx: Transaction): Promise<FraudAlert | null> {
        let alert: FraudAlert | null = null;

        // 1. O(1) Exact Duplicate Payment Detection via Distributed Cache
        const dupHash = `dup:${tx.userId}:${tx.amount}:${tx.recipientId}`;
        const isDuplicate = await this.cache.has(dupHash);
        
        if (isDuplicate) {
            alert = {
                transactionId: tx.id,
                riskScore: 99,
                reason: "Exact duplicate payment detected across distributed nodes.",
                isBlocked: true
            };
            await this.publishAlert(alert);
            return alert;
        }

        // Mark this transaction in cache to prevent immediate duplicates
        await this.cache.set(dupHash, "1", this.TIME_WINDOW_SEC);

        // 2. Suspicious Pair Detection (Distributed "Two Sum")
        const historyKey = `history:${tx.userId}`;
        const rawHistory = await this.cache.getList(historyKey);
        
        const history: Transaction[] = rawHistory.map(item => JSON.parse(item));
        const complementAmount = this.SUSPICIOUS_PAIR_THRESHOLD - tx.amount;

        // O(1) Lookup in recent history
        const recentAmountsMap = new Map<number, Transaction>();
        for (const pastTx of history) {
            recentAmountsMap.set(pastTx.amount, pastTx);
        }

        if (recentAmountsMap.has(complementAmount)) {
            const pairedTx = recentAmountsMap.get(complementAmount)!;
            alert = {
                transactionId: tx.id,
                riskScore: 85,
                reason: `Suspicious paired transaction. Combined with Tx ${pairedTx.id}, hits exact reporting threshold.`,
                isBlocked: false
            };
            await this.publishAlert(alert);
        }

        // 3. Update distributed history and reset TTL
        await this.cache.pushToList(historyKey, JSON.stringify(tx));
        await this.cache.expire(historyKey, this.TIME_WINDOW_SEC);

        return alert;
    }

    private async publishAlert(alert: FraudAlert) {
        // Publish to Kafka for asynchronous downstream processing (e.g., blocking the account)
        await this.broker.publish('fraud-alerts', alert);
    }
}

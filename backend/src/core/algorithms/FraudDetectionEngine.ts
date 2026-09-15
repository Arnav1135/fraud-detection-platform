/**
 * FraudDetectionEngine.ts
 * 
 * Core algorithmic engine demonstrating O(1) time complexity fraud detection
 * using advanced HashMap techniques.
 */

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

export class FraudDetectionEngine {
    // Sliding window HashMaps (simulating Redis/In-memory cache)
    // Key: userId, Value: Array of recent transactions
    private userTransactionHistory: Map<string, Transaction[]> = new Map();
    
    // Key: idempotency hash (userId + amount + recipientId), Value: timestamp
    private exactDuplicateMap: Map<string, number> = new Map();

    private readonly SUSPICIOUS_PAIR_THRESHOLD = 10000; // e.g., $10,000 reporting threshold
    private readonly TIME_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Process a transaction stream in O(1) to O(k) time where k is recent transactions
     */
    public analyzeTransaction(tx: Transaction): FraudAlert | null {
        this.cleanupOldEntries(tx.timestamp);

        // 1. O(1) Duplicate Payment Prevention
        const dupHash = `${tx.userId}-${tx.amount}-${tx.recipientId}`;
        if (this.exactDuplicateMap.has(dupHash)) {
            return {
                transactionId: tx.id,
                riskScore: 99,
                reason: "Exact duplicate payment detected within time window.",
                isBlocked: true
            };
        }
        this.exactDuplicateMap.set(dupHash, tx.timestamp);

        // 2. O(n) -> O(1) Suspicious Pair Detection (The "Two Sum" Implementation)
        // Detect if this transaction + a recent transaction = exactly the threshold
        const history = this.userTransactionHistory.get(tx.userId) || [];
        
        // Target we are looking for in recent history
        const complementAmount = this.SUSPICIOUS_PAIR_THRESHOLD - tx.amount;
        
        // We use a temporary map for O(1) lookup of the complement in recent history
        const recentAmountsMap = new Map<number, Transaction>();
        for (const pastTx of history) {
            recentAmountsMap.set(pastTx.amount, pastTx);
        }

        if (recentAmountsMap.has(complementAmount)) {
            const pairedTx = recentAmountsMap.get(complementAmount)!;
            return {
                transactionId: tx.id,
                riskScore: 85,
                reason: `Suspicious paired transaction detected. Combined with Tx ${pairedTx.id}, hits exact evasion threshold.`,
                isBlocked: false // Flag for manual review
            };
        }

        // 3. Velocity Checks (Rapid repeated transactions)
        if (history.length >= 5) { // More than 5 transactions in 5 minutes
            return {
                transactionId: tx.id,
                riskScore: 90,
                reason: "High velocity transaction anomaly (Account Takeover risk).",
                isBlocked: true
            };
        }

        // Update history
        history.push(tx);
        this.userTransactionHistory.set(tx.userId, history);

        return null; // Clean transaction
    }

    /**
     * Helper to simulate TTL expiry in a sliding window
     */
    private cleanupOldEntries(currentTimestamp: number) {
        // In a real distributed system, Redis TTL handles this automatically.
        // This is a naive in-memory cleanup for demonstration.
        for (const [hash, time] of this.exactDuplicateMap.entries()) {
            if (currentTimestamp - time > this.TIME_WINDOW_MS) {
                this.exactDuplicateMap.delete(hash);
            }
        }
        
        for (const [userId, txs] of this.userTransactionHistory.entries()) {
            const validTxs = txs.filter(tx => currentTimestamp - tx.timestamp <= this.TIME_WINDOW_MS);
            if (validTxs.length === 0) {
                this.userTransactionHistory.delete(userId);
            } else {
                this.userTransactionHistory.set(userId, validTxs);
            }
        }
    }
}

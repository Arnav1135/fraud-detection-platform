import { Transaction, FraudAlert } from '../../algorithms/FraudDetectionEngine';

export interface ITransactionRepository {
    saveTransaction(tx: Transaction): Promise<void>;
    saveFraudAlert(alert: FraudAlert): Promise<void>;
    getRecentTransactionsByUser(userId: string, limit?: number): Promise<Transaction[]>;
}

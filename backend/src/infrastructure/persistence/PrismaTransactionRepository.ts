import { PrismaClient } from '@prisma/client';
import { ITransactionRepository } from '../../core/interfaces/ITransactionRepository';
import { Transaction, FraudAlert } from '../../core/algorithms/FraudDetectionEngine';

export class PrismaTransactionRepository implements ITransactionRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async saveTransaction(tx: Transaction): Promise<void> {
        await this.prisma.transactionRecord.create({
            data: {
                id: tx.id,
                userId: tx.userId,
                amount: tx.amount,
                recipientId: tx.recipientId,
                deviceId: tx.deviceId,
                timestamp: new Date(tx.timestamp)
            }
        });
    }

    async saveFraudAlert(alert: FraudAlert): Promise<void> {
        await this.prisma.fraudAlertRecord.create({
            data: {
                transactionId: alert.transactionId,
                riskScore: alert.riskScore,
                reason: alert.reason,
                aiExplanation: alert.aiExplanation,
                isBlocked: alert.isBlocked,
                detectedBy: alert.detectedBy
            }
        });
    }

    async getRecentTransactionsByUser(userId: string, limit: number = 50): Promise<Transaction[]> {
        const records = await this.prisma.transactionRecord.findMany({
            where: { userId },
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        return records.map(r => ({
            id: r.id,
            userId: r.userId,
            amount: r.amount,
            recipientId: r.recipientId,
            deviceId: r.deviceId,
            timestamp: r.timestamp.getTime()
        }));
    }
}

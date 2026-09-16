import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const resolvers = {
  Query: {
    recentTransactions: async (_: any, args: { userId: string; limit?: number }) => {
      const limit = args.limit || 50;
      const records = await prisma.transactionRecord.findMany({
        where: { userId: args.userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
      return records.map((r: any) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      }));
    },
    
    recentFraudAlerts: async (_: any, args: { limit?: number }) => {
      const limit = args.limit || 50;
      const records = await prisma.fraudAlertRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return records.map((r: any) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }));
    }
  }
};

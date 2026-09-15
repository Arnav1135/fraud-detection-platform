import { RedisCacheService } from './infrastructure/redis/RedisCacheService';
import { KafkaMessageBroker } from './infrastructure/kafka/KafkaMessageBroker';
import { OpenAIFraudExplainer } from './infrastructure/ai/OpenAIFraudExplainer';
import { MetricsService } from './infrastructure/telemetry/MetricsService';
import { FraudDetectionEngine, Transaction } from './core/algorithms/FraudDetectionEngine';
import { TokenBucketRateLimiter } from './core/algorithms/TokenBucketRateLimiter';
import { PrismaTransactionRepository } from './infrastructure/persistence/PrismaTransactionRepository';
import { authRouter } from './infrastructure/api/AuthRouter';
import { authenticate, authorize, Role } from './infrastructure/auth/JwtAuthMiddleware';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

async function bootstrap() {
    console.log('🚀 Bootstrapping Fraud Detection Platform (Architect / L7 Level)...');

    // 1. Dependency Injection / IoC
    const cacheService = new RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    const messageBroker = new KafkaMessageBroker('fraud-engine-node', [process.env.KAFKA_BROKER || 'localhost:9092']);
    const aiService = new OpenAIFraudExplainer();
    const metricsService = new MetricsService();
    const rateLimiter = new TokenBucketRateLimiter(cacheService, 100, 10);
    const dbRepository = new PrismaTransactionRepository();

    await messageBroker.connect();

    const engine = new FraudDetectionEngine(cacheService, messageBroker, aiService, metricsService);

    // 2. Setup Express & HTTP Server
    const app = express();
    app.use(express.json());
    const server = http.createServer(app);

    app.get('/health', (req, res) => res.send('OK'));
    app.use('/api/auth', authRouter);

    app.get('/metrics', authenticate, authorize(Role.ADMIN), async (req: Request, res: Response) => {
        res.set('Content-Type', 'text/plain');
        res.send(await metricsService.getMetrics());
    });

    app.post('/api/transactions/ingest', authenticate, async (req: Request, res: Response) => {
        const clientId = (req as any).user.userId;
        const limit = await rateLimiter.consume(clientId);
        
        if (!limit.allowed) {
            res.status(429).setHeader('Retry-After', Math.ceil(limit.retryAfterMs / 1000).toString());
            res.status(429).json({ error: 'Too Many Requests', retryAfterMs: limit.retryAfterMs });
            return;
        }

        const tx = req.body as Transaction;
        if (!tx.id || !tx.amount) {
            res.status(400).json({ error: 'Invalid transaction payload.' });
            return;
        }

        // Persist raw transaction to Postgres
        await dbRepository.saveTransaction(tx).catch(e => console.error("DB Error:", e.message));

        await messageBroker.publish('transactions.live', tx);
        res.status(202).json({ status: 'Accepted', transactionId: tx.id });
    });

    // 3. Setup WebSocket Server
    const wss = new WebSocketServer({ server });
    const clients = new Set<WebSocket>();

    wss.on('connection', (ws) => {
        clients.add(ws);
        ws.send(JSON.stringify({ type: 'SYSTEM_READY' }));
        ws.on('close', () => clients.delete(ws));
    });

    server.listen(3000, () => {
        console.log('✅ Fraud Engine Core & API Server running on port 3000');
    });

    // 4. Kafka Consumer
    await messageBroker.subscribe('transactions.live', async (tx: Transaction) => {
        const alert = await engine.analyzeTransaction(tx);
        
        if (alert) {
            // Persist fraud alert to Postgres
            await dbRepository.saveFraudAlert(alert).catch(e => console.error("DB Error:", e.message));

            const payload = JSON.stringify({ type: 'FRAUD_ALERT', data: alert });
            for (const client of clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(payload);
                }
            }
        }
    });
}

bootstrap().catch(err => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});

import { RedisCacheService } from './infrastructure/redis/RedisCacheService';
import { KafkaMessageBroker } from './infrastructure/kafka/KafkaMessageBroker';
import { OpenAIFraudExplainer } from './infrastructure/ai/OpenAIFraudExplainer';
import { MetricsService } from './infrastructure/telemetry/MetricsService';
import { FraudDetectionEngine, Transaction } from './core/algorithms/FraudDetectionEngine';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

async function bootstrap() {
    console.log('🚀 Bootstrapping Fraud Detection Platform (Architect / L7 Level)...');

    // 1. Dependency Injection / IoC
    const cacheService = new RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    const messageBroker = new KafkaMessageBroker('fraud-engine-node', [process.env.KAFKA_BROKER || 'localhost:9092']);
    const aiService = new OpenAIFraudExplainer();
    const metricsService = new MetricsService();

    await messageBroker.connect();

    const engine = new FraudDetectionEngine(cacheService, messageBroker, aiService, metricsService);

    // 2. Setup Express & HTTP Server
    const app = express();
    const server = http.createServer(app);

    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(await metricsService.getMetrics());
    });
    app.get('/health', (req, res) => res.send('OK'));

    // 3. Setup Real-time WebSocket Server for SOC Dashboard
    const wss = new WebSocketServer({ server });
    const clients = new Set<WebSocket>();

    wss.on('connection', (ws) => {
        console.log('🔌 New Security Analyst connected to Live Dashboard.');
        clients.add(ws);
        ws.send(JSON.stringify({ type: 'SYSTEM_READY', message: 'Connected to Fraud Engine Stream' }));

        ws.on('close', () => clients.delete(ws));
    });

    server.listen(3000, () => {
        console.log('📊 Prometheus Metrics & WebSocket server running on port 3000');
    });

    console.log('✅ Fraud Engine is running and monitoring transactions...');

    // 4. Start consuming transaction stream from Kafka
    await messageBroker.subscribe('transactions.live', async (tx: Transaction) => {
        console.log(`\n[Stream] Received Transaction: ${tx.id} ($${tx.amount})`);
        
        const alert = await engine.analyzeTransaction(tx);
        
        if (alert) {
            console.log(`[ALERT] 🚨 Flagged ${tx.id} | Score: ${alert.riskScore}`);
            console.log(`[AI INSIGHT] 🧠 ${alert.aiExplanation}`);

            // Broadcast real-time alerts to the frontend React Dashboard
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

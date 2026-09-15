import { RedisCacheService } from './infrastructure/redis/RedisCacheService';
import { KafkaMessageBroker } from './infrastructure/kafka/KafkaMessageBroker';
import { OpenAIFraudExplainer } from './infrastructure/ai/OpenAIFraudExplainer';
import { MetricsService } from './infrastructure/telemetry/MetricsService';
import { FraudDetectionEngine, Transaction } from './core/algorithms/FraudDetectionEngine';
import express from 'express';

async function bootstrap() {
    console.log('🚀 Bootstrapping Fraud Detection Platform (Principal SDE Level)...');

    // 1. Dependency Injection / IoC
    const cacheService = new RedisCacheService(process.env.REDIS_URL || 'redis://localhost:6379');
    const messageBroker = new KafkaMessageBroker('fraud-engine-node', [process.env.KAFKA_BROKER || 'localhost:9092']);
    const aiService = new OpenAIFraudExplainer();
    const metricsService = new MetricsService();

    await messageBroker.connect();

    const engine = new FraudDetectionEngine(cacheService, messageBroker, aiService, metricsService);

    // 2. Start Observability Server (Prometheus Scraper Endpoint)
    const app = express();
    app.get('/metrics', async (req, res) => {
        res.set('Content-Type', 'text/plain');
        res.send(await metricsService.getMetrics());
    });
    app.get('/health', (req, res) => res.send('OK'));
    app.listen(3000, () => console.log('📊 Prometheus Metrics server running on port 3000'));

    console.log('✅ Fraud Engine is running and monitoring transactions...');

    // 3. Start consuming transaction stream from Kafka
    await messageBroker.subscribe('transactions.live', async (tx: Transaction) => {
        console.log(`\n[Stream] Received Transaction: ${tx.id} ($${tx.amount})`);
        
        const alert = await engine.analyzeTransaction(tx);
        
        if (alert) {
            console.log(`[ALERT] 🚨 Flagged ${tx.id} | Score: ${alert.riskScore}`);
            console.log(`[AI INSIGHT] 🧠 ${alert.aiExplanation}`);
        }
    });
}

bootstrap().catch(err => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});

import { RedisCacheService } from './infrastructure/redis/RedisCacheService';
import { KafkaMessageBroker } from './infrastructure/kafka/KafkaMessageBroker';
import { FraudDetectionEngine, Transaction } from './core/algorithms/FraudDetectionEngine';

async function bootstrap() {
    console.log('🚀 Bootstrapping Fraud Detection Platform (SDE-3 Level)...');

    // 1. Initialize Infrastructure Configuration
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

    // 2. Dependency Injection / IoC Setup
    console.log('[IoC] Instantiating dependencies...');
    const cacheService = new RedisCacheService(redisUrl);
    const messageBroker = new KafkaMessageBroker('fraud-engine-node', [kafkaBroker]);

    await messageBroker.connect();

    // 3. Inject dependencies into Core Engine
    const engine = new FraudDetectionEngine(cacheService, messageBroker);

    console.log('✅ Fraud Engine is running and waiting for transactions...');

    // 4. Start consuming transaction stream from Kafka
    await messageBroker.subscribe('transactions.live', async (tx: Transaction) => {
        console.log(`\n[Stream] Received Transaction: ${tx.id} ($${tx.amount})`);
        
        // Pass through our O(1) Engine
        const alert = await engine.analyzeTransaction(tx);
        
        if (alert) {
            console.log(`[ALERT] 🚨 Flagged ${tx.id} | Score: ${alert.riskScore} | Reason: ${alert.reason}`);
        } else {
            console.log(`[CLEAN] ✅ Transaction ${tx.id} processed successfully.`);
        }
    });
}

bootstrap().catch(err => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
});

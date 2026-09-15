import * as promClient from 'prom-client';

export class MetricsService {
    public readonly transactionsProcessed: promClient.Counter;
    public readonly fraudAlertsGenerated: promClient.Counter;
    public readonly processingLatency: promClient.Histogram;

    constructor() {
        promClient.collectDefaultMetrics();

        this.transactionsProcessed = new promClient.Counter({
            name: 'fraud_engine_transactions_total',
            help: 'Total number of transactions processed'
        });

        this.fraudAlertsGenerated = new promClient.Counter({
            name: 'fraud_engine_alerts_total',
            help: 'Total number of fraud alerts generated'
        });

        this.processingLatency = new promClient.Histogram({
            name: 'fraud_engine_processing_latency_ms',
            help: 'Latency of transaction processing in milliseconds',
            buckets: [5, 10, 25, 50, 100, 250, 500] // Buckets for sub-50ms goals
        });
    }

    async getMetrics(): Promise<string> {
        return promClient.register.metrics();
    }
}

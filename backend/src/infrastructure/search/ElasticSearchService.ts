import { Client } from '@elastic/elasticsearch';
import { Transaction } from '../../core/algorithms/FraudDetectionEngine';

export class ElasticSearchService {
    private client: Client;
    private readonly INDEX_NAME = 'transactions-live';

    constructor() {
        this.client = new Client({
            node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
        });
        
        this.initializeIndex().catch(e => console.error("ElasticSearch Init Error:", e));
    }

    private async initializeIndex() {
        const indexExists = await this.client.indices.exists({ index: this.INDEX_NAME });
        if (!indexExists) {
            await this.client.indices.create({
                index: this.INDEX_NAME,
                mappings: {
                    properties: {
                        id: { type: 'keyword' },
                        userId: { type: 'keyword' },
                        recipientId: { type: 'keyword' },
                        amount: { type: 'double' },
                        timestamp: { type: 'date' },
                        deviceId: { type: 'keyword' }
                    }
                }
            });
            console.log(`✅ ElasticSearch Index '${this.INDEX_NAME}' initialized.`);
        }
    }

    /**
     * Index a transaction asynchronously for blazing fast Kibana/API querying
     */
    public async indexTransaction(tx: Transaction) {
        try {
            await this.client.index({
                index: this.INDEX_NAME,
                id: tx.id,
                document: tx
            });
        } catch (error) {
            console.error("Failed to index transaction in ElasticSearch:", error);
        }
    }
}

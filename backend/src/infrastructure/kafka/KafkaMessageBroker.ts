import { Kafka, Producer, Consumer } from 'kafkajs';
import { IMessageBroker } from '../../core/interfaces/IMessageBroker';

export class KafkaMessageBroker implements IMessageBroker {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor(clientId: string, brokers: string[]) {
        this.kafka = new Kafka({
            clientId,
            brokers
        });
        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
    }

    async connect(): Promise<void> {
        await this.producer.connect();
        console.log(`[Kafka] Connected Producer`);
    }

    async disconnect(): Promise<void> {
        await this.producer.disconnect();
        await this.consumer.disconnect();
    }

    async publish(topic: string, message: any): Promise<void> {
        await this.producer.send({
            topic,
            messages: [{ value: JSON.stringify(message) }]
        });
        console.log(`[Kafka] Published to ${topic}:`, message.transactionId || 'data');
    }

    async subscribe(topic: string, handler: (message: any) => Promise<void>): Promise<void> {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic, fromBeginning: false });

        await this.consumer.run({
            eachMessage: async ({ message }) => {
                if (message.value) {
                    await handler(JSON.parse(message.value.toString()));
                }
            }
        });
        console.log(`[Kafka] Subscribed to ${topic}`);
    }
}

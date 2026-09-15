import { Redis } from 'ioredis';
import { ICacheService } from '../../core/interfaces/ICacheService';

export class RedisCacheService implements ICacheService {
    private client: Redis;

    constructor(redisUrl: string) {
        this.client = new Redis(redisUrl);
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async has(key: string): Promise<boolean> {
        const exists = await this.client.exists(key);
        return exists === 1;
    }

    async pushToList(key: string, value: string): Promise<void> {
        await this.client.lpush(key, value);
        // Keep only the last 100 transactions to cap memory
        await this.client.ltrim(key, 0, 99);
    }

    async getList(key: string): Promise<string[]> {
        return this.client.lrange(key, 0, -1);
    }

    async expire(key: string, ttlSeconds: number): Promise<void> {
        await this.client.expire(key, ttlSeconds);
    }
}

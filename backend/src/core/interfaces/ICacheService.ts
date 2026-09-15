export interface ICacheService {
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    has(key: string): Promise<boolean>;
    
    // For sliding window rate limiting / transaction history
    pushToList(key: string, value: string): Promise<void>;
    getList(key: string): Promise<string[]>;
    expire(key: string, ttlSeconds: number): Promise<void>;
}

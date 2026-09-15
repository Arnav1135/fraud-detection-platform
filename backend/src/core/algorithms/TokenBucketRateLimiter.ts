/**
 * TokenBucketRateLimiter.ts
 * 
 * A production-grade Token Bucket rate limiter backed by Redis.
 * Demonstrates advanced data structure knowledge (Token Bucket Algorithm)
 * with distributed state via Redis for horizontal scaling.
 * 
 * Time Complexity: O(1) per request
 * Space Complexity: O(n) where n = unique clients
 */

import { ICacheService } from '../../core/interfaces/ICacheService';

export interface RateLimitResult {
    allowed: boolean;
    remainingTokens: number;
    retryAfterMs: number;
}

export class TokenBucketRateLimiter {
    constructor(
        private readonly cache: ICacheService,
        private readonly maxTokens: number = 100,       // Max burst capacity
        private readonly refillRatePerSec: number = 10   // Tokens added per second
    ) {}

    /**
     * Check if a request from a given client should be allowed.
     * Uses the Token Bucket algorithm with Redis for distributed state.
     */
    async consume(clientId: string): Promise<RateLimitResult> {
        const bucketKey = `ratelimit:${clientId}`;
        const lastRefillKey = `ratelimit:${clientId}:lastRefill`;

        const now = Date.now();

        // Get current state from distributed cache
        const storedTokens = await this.cache.get(bucketKey);
        const storedLastRefill = await this.cache.get(lastRefillKey);

        let tokens = storedTokens !== null ? parseFloat(storedTokens) : this.maxTokens;
        let lastRefill = storedLastRefill !== null ? parseInt(storedLastRefill) : now;

        // Calculate tokens to add based on elapsed time
        const elapsedMs = now - lastRefill;
        const tokensToAdd = (elapsedMs / 1000) * this.refillRatePerSec;
        tokens = Math.min(this.maxTokens, tokens + tokensToAdd);

        if (tokens < 1) {
            const waitMs = Math.ceil((1 - tokens) / this.refillRatePerSec * 1000);
            return { allowed: false, remainingTokens: 0, retryAfterMs: waitMs };
        }

        // Consume one token
        tokens -= 1;

        // Persist state back to Redis (TTL of 60s to auto-cleanup idle clients)
        await this.cache.set(bucketKey, tokens.toString(), 60);
        await this.cache.set(lastRefillKey, now.toString(), 60);

        return { allowed: true, remainingTokens: Math.floor(tokens), retryAfterMs: 0 };
    }
}

import { BloomFilter } from './BloomFilter';
import { LRUCache } from './LRUCache';
import { GraphFraudAnalyzer } from './GraphFraudAnalyzer';
import { TokenBucketRateLimiter } from './TokenBucketRateLimiter';

// ─── Bloom Filter Tests ──────────────────────────────────────────────────────
function testBloomFilter() {
    console.log('\n📋 Bloom Filter Tests');
    const bf = new BloomFilter(1000, 0.01);

    bf.add('user-123:500:merchant-A');
    bf.add('user-456:1000:merchant-B');

    const r1 = bf.mightContain('user-123:500:merchant-A');
    console.log(`  Known item (should be true):   ${r1 === true ? '✅' : '❌'} ${r1}`);

    const r2 = bf.mightContain('user-999:9999:merchant-Z');
    console.log(`  Unknown item (likely false):   ${r2 === false ? '✅' : '⚠️ (false positive)'} ${r2}`);

    console.log(`  Memory usage: ${bf.getMemoryUsageBytes()} bytes`);
}

// ─── LRU Cache Tests ─────────────────────────────────────────────────────────
function testLRUCache() {
    console.log('\n📋 LRU Cache Tests (capacity = 3)');
    const cache = new LRUCache<string, number>(3);

    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('c', 3);

    console.log(`  get('a') = ${cache.get('a')} (expected 1) ${cache.get('a') === 1 ? '✅' : '❌'}`);

    // 'b' is now LRU — adding 'd' should evict 'b'
    cache.put('d', 4);
    const evicted = cache.get('b');
    console.log(`  get('b') after eviction = ${evicted} (expected null) ${evicted === null ? '✅' : '❌'}`);
    console.log(`  get('d') = ${cache.get('d')} (expected 4) ${cache.get('d') === 4 ? '✅' : '❌'}`);
    console.log(`  Hit ratio: ${(cache.getHitRatio() * 100).toFixed(1)}%`);
}

// ─── Graph Fraud Analyzer Tests ───────────────────────────────────────────────
function testGraphFraudAnalyzer() {
    console.log('\n📋 Graph DFS Cycle Detection Tests');
    const graph = new GraphFraudAnalyzer();

    // Simulate a money mule ring: A → B → C → A
    graph.addTransaction('user-A', 'user-B');
    graph.addTransaction('user-B', 'user-C');
    graph.addTransaction('user-C', 'user-A'); // Closes the ring

    const result = graph.detectCycle('user-A');
    console.log(`  Circular ring detected: ${result.detected ? '✅' : '❌'}`);
    if (result.detected) {
        console.log(`  Ring path: ${result.cycle?.join(' → ')}`);
    }

    // Clean path: X → Y (no cycle)
    const graph2 = new GraphFraudAnalyzer();
    graph2.addTransaction('user-X', 'user-Y');
    const result2 = graph2.detectCycle('user-X');
    console.log(`  Clean path (no cycle): ${!result2.detected ? '✅' : '❌'}`);
}

// ─── Rate Limiter Tests ───────────────────────────────────────────────────────
async function testRateLimiter() {
    console.log('\n📋 Token Bucket Rate Limiter Tests');

    // Mock cache for testing
    const mockStore = new Map<string, string>();
    const mockCache = {
        get: async (k: string) => mockStore.get(k) ?? null,
        set: async (k: string, v: string) => { mockStore.set(k, v); },
        has: async (k: string) => mockStore.has(k),
        pushToList: async () => {},
        getList: async () => [],
        expire: async () => {},
    };

    const limiter = new TokenBucketRateLimiter(mockCache as any, 3, 1);

    const r1 = await limiter.consume('client-1');
    const r2 = await limiter.consume('client-1');
    const r3 = await limiter.consume('client-1');
    const r4 = await limiter.consume('client-1'); // Should be denied

    console.log(`  Request 1 (allowed): ${r1.allowed ? '✅' : '❌'}`);
    console.log(`  Request 2 (allowed): ${r2.allowed ? '✅' : '❌'}`);
    console.log(`  Request 3 (allowed): ${r3.allowed ? '✅' : '❌'}`);
    console.log(`  Request 4 (blocked): ${!r4.allowed ? '✅' : '❌'} | Retry after: ${r4.retryAfterMs}ms`);
}

// ─── Run all tests ────────────────────────────────────────────────────────────
async function runAllTests() {
    console.log('🚀 Running Full Algorithm Test Suite...');
    console.log('='.repeat(50));

    testBloomFilter();
    testLRUCache();
    testGraphFraudAnalyzer();
    await testRateLimiter();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All algorithm tests complete.\n');
}

runAllTests().catch(console.error);

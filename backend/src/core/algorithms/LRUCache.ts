/**
 * LRUCache.ts
 * 
 * A production-grade Least Recently Used (LRU) Cache implementation
 * using a Doubly Linked List + HashMap for O(1) get and put operations.
 * 
 * Used in the fraud engine as an in-process L1 cache, sitting in front
 * of Redis (L2), reducing distributed cache round-trips for hot keys.
 * 
 * Time Complexity: O(1) get, O(1) put
 * Space Complexity: O(capacity)
 */

class DLLNode<K, V> {
    key: K;
    value: V;
    prev: DLLNode<K, V> | null = null;
    next: DLLNode<K, V> | null = null;

    constructor(key: K, value: V) {
        this.key = key;
        this.value = value;
    }
}

export class LRUCache<K, V> {
    private capacity: number;
    private map: Map<K, DLLNode<K, V>> = new Map();
    
    // Sentinel nodes to avoid null-checking edge cases
    private head: DLLNode<K, V>;
    private tail: DLLNode<K, V>;

    private hits = 0;
    private misses = 0;

    constructor(capacity: number) {
        this.capacity = capacity;
        // head <-> [most recently used] <-> [least recently used] <-> tail
        this.head = new DLLNode<K, V>(null as any, null as any);
        this.tail = new DLLNode<K, V>(null as any, null as any);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    /** Get a value, marking it as most recently used. O(1) */
    get(key: K): V | null {
        const node = this.map.get(key);
        if (!node) {
            this.misses++;
            return null;
        }
        this.hits++;
        this.moveToFront(node);
        return node.value;
    }

    /** Insert or update a value. Evicts LRU entry if at capacity. O(1) */
    put(key: K, value: V): void {
        const existing = this.map.get(key);
        if (existing) {
            existing.value = value;
            this.moveToFront(existing);
            return;
        }

        if (this.map.size >= this.capacity) {
            this.evictLRU();
        }

        const node = new DLLNode(key, value);
        this.map.set(key, node);
        this.addToFront(node);
    }

    /** Returns cache hit ratio for observability/telemetry */
    getHitRatio(): number {
        const total = this.hits + this.misses;
        return total === 0 ? 0 : this.hits / total;
    }

    get size(): number {
        return this.map.size;
    }

    private addToFront(node: DLLNode<K, V>): void {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next!.prev = node;
        this.head.next = node;
    }

    private removeNode(node: DLLNode<K, V>): void {
        node.prev!.next = node.next;
        node.next!.prev = node.prev;
    }

    private moveToFront(node: DLLNode<K, V>): void {
        this.removeNode(node);
        this.addToFront(node);
    }

    private evictLRU(): void {
        const lru = this.tail.prev!;
        this.removeNode(lru);
        this.map.delete(lru.key);
    }
}

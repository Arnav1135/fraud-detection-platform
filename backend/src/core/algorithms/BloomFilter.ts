/**
 * BloomFilter.ts
 * 
 * A pure in-memory Bloom Filter implementation.
 * Probabilistic data structure for O(1) membership testing with zero false negatives.
 * 
 * Used in the fraud engine as a first-pass filter before hitting Redis,
 * reducing network calls by ~95% for clean transactions.
 * 
 * Time Complexity:  O(k) per insert/query where k = number of hash functions
 * Space Complexity: O(m) bits where m = filter size
 * False Positive Rate: ~(1 - e^(-kn/m))^k
 */

export class BloomFilter {
    private bitArray: Uint8Array;
    private readonly size: number;
    private readonly numHashFunctions: number;

    constructor(expectedElements: number = 1_000_000, falsePositiveRate: number = 0.001) {
        // Optimal size: m = -n * ln(p) / (ln(2))^2
        this.size = Math.ceil(-expectedElements * Math.log(falsePositiveRate) / (Math.LN2 * Math.LN2));
        // Optimal hash count: k = (m/n) * ln(2)
        this.numHashFunctions = Math.ceil((this.size / expectedElements) * Math.LN2);
        this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
    }

    /**
     * Add an element to the filter. O(k) time.
     */
    add(item: string): void {
        const hashes = this.getHashes(item);
        for (const hash of hashes) {
            const index = hash % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            this.bitArray[byteIndex] |= (1 << bitIndex);
        }
    }

    /**
     * Test if an element MIGHT be in the set. O(k) time.
     * Returns false  => DEFINITELY not in the set (zero false negatives)
     * Returns true   => PROBABLY in the set (small false positive rate)
     */
    mightContain(item: string): boolean {
        const hashes = this.getHashes(item);
        for (const hash of hashes) {
            const index = hash % this.size;
            const byteIndex = Math.floor(index / 8);
            const bitIndex = index % 8;
            if ((this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
                return false; // Definitely not in set
            }
        }
        return true; // Probably in set
    }

    /**
     * Returns the current memory usage in bytes.
     */
    getMemoryUsageBytes(): number {
        return this.bitArray.byteLength;
    }

    /**
     * Generate k independent hash values using double hashing technique.
     * h_i(x) = h1(x) + i * h2(x) mod m
     */
    private getHashes(item: string): number[] {
        const h1 = this.fnv1a(item);
        const h2 = this.murmurHash3(item);
        const hashes: number[] = [];
        for (let i = 0; i < this.numHashFunctions; i++) {
            hashes.push(Math.abs((h1 + i * h2) % this.size));
        }
        return hashes;
    }

    /** FNV-1a hash function */
    private fnv1a(str: string): number {
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = (hash * 0x01000193) >>> 0;
        }
        return hash;
    }

    /** MurmurHash3-inspired hash function */
    private murmurHash3(str: string): number {
        let h = 0xdeadbeef;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
            h ^= h >>> 13;
        }
        return h >>> 0;
    }
}

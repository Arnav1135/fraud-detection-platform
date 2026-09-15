/**
 * GraphFraudAnalyzer.ts
 *
 * Detects circular money transfers using a directed graph + DFS cycle detection.
 * This is advanced system design — modelling financial relationships as a graph
 * and using Depth-First Search (DFS) to find circular fraud rings.
 *
 * Example: A -> B -> C -> A (circular "layering" attack in money laundering)
 *
 * Time Complexity:  O(V + E) where V = users, E = transactions
 * Space Complexity: O(V + E)
 */

export interface CircularFraudResult {
    detected: boolean;
    cycle?: string[];
}

export class GraphFraudAnalyzer {
    // Adjacency list: senderId -> Set of receiverIds
    private graph: Map<string, Set<string>> = new Map();

    /**
     * Record a transaction as a directed edge in the graph.
     */
    addTransaction(senderId: string, receiverId: string): void {
        if (!this.graph.has(senderId)) {
            this.graph.set(senderId, new Set());
        }
        this.graph.get(senderId)!.add(receiverId);
    }

    /**
     * Detect if adding a new transaction would create a circular transfer ring.
     * Uses DFS with a recursion stack to detect back edges.
     */
    detectCycle(startNode: string): CircularFraudResult {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const path: string[] = [];

        const dfs = (node: string): boolean => {
            visited.add(node);
            recursionStack.add(node);
            path.push(node);

            const neighbors = this.graph.get(node) || new Set<string>();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor)) return true;
                } else if (recursionStack.has(neighbor)) {
                    // Found a back edge → cycle detected!
                    path.push(neighbor); // Close the cycle for display
                    return true;
                }
            }

            recursionStack.delete(node);
            path.pop();
            return false;
        };

        const hasCycle = dfs(startNode);

        if (hasCycle) {
            return { detected: true, cycle: [...path] };
        }
        return { detected: false };
    }

    /**
     * Prune old edges to keep the graph from growing unbounded.
     */
    removeUser(userId: string): void {
        this.graph.delete(userId);
        for (const neighbors of this.graph.values()) {
            neighbors.delete(userId);
        }
    }
}

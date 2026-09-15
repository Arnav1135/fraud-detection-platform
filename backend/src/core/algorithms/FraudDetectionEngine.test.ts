import { FraudDetectionEngine, Transaction } from './FraudDetectionEngine';

// Simple test runner for demonstration without needing Jest installed
function runTests() {
    console.log("🚀 Running Fraud Detection Engine Tests...\n");
    
    const engine = new FraudDetectionEngine();
    const baseTime = Date.now();

    // Test 1: Clean Transaction
    const tx1: Transaction = {
        id: "tx-001", userId: "user-123", amount: 150, 
        timestamp: baseTime, deviceId: "device-1", recipientId: "merchant-A"
    };
    
    const result1 = engine.analyzeTransaction(tx1);
    console.log(`Test 1 (Clean Tx): ${result1 === null ? "✅ PASS" : "❌ FAIL"}`);

    // Test 2: O(1) Exact Duplicate Payment
    const tx2: Transaction = {
        id: "tx-002", userId: "user-123", amount: 150, 
        timestamp: baseTime + 1000, deviceId: "device-1", recipientId: "merchant-A"
    };
    
    const result2 = engine.analyzeTransaction(tx2);
    if (result2 && result2.isBlocked && result2.reason.includes("duplicate")) {
        console.log(`Test 2 (Duplicate Block): ✅ PASS -> Score: ${result2.riskScore}`);
    } else {
        console.log(`Test 2 (Duplicate Block): ❌ FAIL`);
    }

    // Test 3: "Two Sum" Suspicious Pair Detection ($4500 + $5500 = $10000)
    const tx3: Transaction = {
        id: "tx-003", userId: "user-999", amount: 4500, 
        timestamp: baseTime + 2000, deviceId: "device-2", recipientId: "merchant-B"
    };
    engine.analyzeTransaction(tx3); // Should be clean initially
    
    const tx4: Transaction = {
        id: "tx-004", userId: "user-999", amount: 5500, 
        timestamp: baseTime + 3000, deviceId: "device-2", recipientId: "merchant-C"
    };
    const result4 = engine.analyzeTransaction(tx4);
    
    if (result4 && result4.reason.includes("Suspicious paired transaction")) {
        console.log(`Test 3 (Two Sum Evader): ✅ PASS -> Flagged for review (Score: ${result4.riskScore})`);
    } else {
        console.log(`Test 3 (Two Sum Evader): ❌ FAIL`);
    }

    console.log("\nAll tests completed.");
}

runTests();

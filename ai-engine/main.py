from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
import numpy as np
import time

app = FastAPI(title="Fraud AI Explainer & ML Engine")

# Train a dummy Isolation Forest model on startup to simulate ML-based anomaly detection
print("🧠 Training ML Anomaly Detection Model (Isolation Forest)...")
model = IsolationForest(contamination=0.01, random_state=42)
# Dummy training data (features: amount, time_since_last_txn, recipient_risk_score)
X_train = np.random.rand(1000, 3) * 100
model.fit(X_train)
print("✅ ML Model Ready.")

class TransactionFeature(BaseModel):
    transactionId: str
    amount: float
    timeSinceLastTxn: float
    recipientRiskScore: float

@app.post("/analyze")
async def analyze_transaction(tx: TransactionFeature):
    # Simulate inference latency
    time.sleep(0.05)
    
    # Run features through the Isolation Forest
    features = np.array([[tx.amount, tx.timeSinceLastTxn, tx.recipientRiskScore]])
    prediction = model.predict(features)[0] # 1 for inlier, -1 for outlier
    anomaly_score = model.score_samples(features)[0]
    
    is_anomaly = bool(prediction == -1)
    
    explanation = f"ML Anomaly Score: {anomaly_score:.2f}. "
    if is_anomaly:
        explanation += f"The transaction amount (${tx.amount}) paired with a high recipient risk score ({tx.recipientRiskScore}) deviates significantly from standard behavioral clusters. Classified as potential Account Takeover or Money Laundering."
    else:
        explanation += "Transaction falls within normal behavioral clusters."

    return {
        "transactionId": tx.transactionId,
        "isAnomaly": is_anomaly,
        "anomalyScore": anomaly_score,
        "aiExplanation": explanation
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

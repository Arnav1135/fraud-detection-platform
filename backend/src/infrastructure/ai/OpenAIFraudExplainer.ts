import { IAIService } from '../../core/interfaces/IAIService';

export class OpenAIFraudExplainer implements IAIService {
    private readonly aiEngineUrl: string;

    constructor() {
        // In local development without docker, this might be localhost
        this.aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
    }

    /**
     * Calls the Python FastAPI Machine Learning Microservice 
     * to run the transaction through the Isolation Forest model.
     */
    async generateFraudExplanation(tx: any, history: any): Promise<string> {
        try {
            // We calculate some rough features for the ML model
            const timeSinceLastTxn = Math.abs(tx.timestamp - history.timestamp) / 1000;
            // Simulated risk score between 0 and 100
            const recipientRiskScore = (tx.amount % 100) + (history.amount % 50);

            const response = await fetch(`${this.aiEngineUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: tx.id,
                    amount: tx.amount,
                    timeSinceLastTxn: timeSinceLastTxn,
                    recipientRiskScore: recipientRiskScore
                })
            });

            if (!response.ok) {
                console.error("AI Engine error:", await response.text());
                return "ML Analysis temporarily unavailable. Pattern triggered algorithmic thresholds.";
            }

            const result = await response.json();
            return result.aiExplanation;

        } catch (error) {
            console.error('Failed to communicate with AI Engine:', error);
            return "ML Analysis temporarily unavailable. Pattern triggered algorithmic thresholds.";
        }
    }
}

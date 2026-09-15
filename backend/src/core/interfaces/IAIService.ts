export interface IAIService {
    generateFraudExplanation(transactionDetails: any, historicalContext: any): Promise<string>;
}

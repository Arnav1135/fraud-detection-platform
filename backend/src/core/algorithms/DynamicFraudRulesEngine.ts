import { Engine, RuleProperties } from 'json-rules-engine';
import { Transaction } from './FraudDetectionEngine';

export interface DynamicRuleResult {
    triggered: boolean;
    reason?: string;
    score?: number;
}

export class DynamicFraudRulesEngine {
    private engine: Engine;

    constructor() {
        this.engine = new Engine();
        this.loadDefaultRules();
    }

    /**
     * In a real production system, these rules would be fetched from 
     * a Postgres database or Redis cache, allowing business analysts to 
     * update fraud rules on the fly without deploying code.
     */
    private loadDefaultRules() {
        const largeTransactionRule: RuleProperties = {
            conditions: {
                all: [{
                    fact: 'transaction',
                    path: '$.amount',
                    operator: 'greaterThanInclusive',
                    value: 50000
                }]
            },
            event: {
                type: 'HIGH_RISK_AMOUNT',
                params: {
                    message: 'Transaction exceeds $50,000 threshold.',
                    score: 85
                }
            }
        };

        const highRiskMerchantRule: RuleProperties = {
            conditions: {
                all: [{
                    fact: 'transaction',
                    path: '$.recipientId',
                    operator: 'in',
                    value: ['merchant-crypto-1', 'merchant-casino-9'] // High risk categories
                }]
            },
            event: {
                type: 'HIGH_RISK_MERCHANT',
                params: {
                    message: 'Recipient is flagged as a high-risk merchant category.',
                    score: 90
                }
            }
        };

        this.engine.addRule(largeTransactionRule);
        this.engine.addRule(highRiskMerchantRule);
    }

    /**
     * Add or update a rule dynamically at runtime
     */
    public addDynamicRule(rule: RuleProperties) {
        this.engine.addRule(rule);
    }

    /**
     * Evaluates a transaction against all dynamic business rules
     */
    public async evaluate(tx: Transaction): Promise<DynamicRuleResult[]> {
        const facts = { transaction: tx };
        const { events } = await this.engine.run(facts);
        
        return events.map(event => ({
            triggered: true,
            reason: event.params?.message as string,
            score: event.params?.score as number
        }));
    }
}

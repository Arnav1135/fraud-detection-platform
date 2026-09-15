describe('Fraud Command Center Dashboard', () => {
  beforeEach(() => {
    // Intercept WebSocket connections to mock the backend for testing
    // In a real e2e, we might let it connect to a test backend.
    cy.visit('/');
  });

  it('successfully loads the dashboard UI', () => {
    cy.contains('Fraud Command Center');
    cy.contains('5-Layer Detection');
  });

  it('displays the telemetry stat cards', () => {
    cy.contains('Transactions Processed');
    cy.contains('Blocked');
    cy.contains('Avg Latency');
    cy.contains('Bloom Filter Saved');
    cy.contains('LRU Hit Ratio');
  });

  it('shows the detection pipeline architecture', () => {
    cy.contains('Detection Pipeline');
    cy.contains('Bloom Filter');
    cy.contains('LRU Cache');
    cy.contains('Redis Window');
    cy.contains('Two-Sum Detector');
    cy.contains('Graph DFS');
    cy.contains('LLM Explainer');
  });
});

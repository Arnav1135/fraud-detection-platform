import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Transaction {
    id: ID!
    userId: String!
    amount: Float!
    recipientId: String!
    deviceId: String!
    timestamp: String!
  }

  type FraudAlert {
    id: ID!
    transactionId: String!
    riskScore: Int!
    reason: String!
    aiExplanation: String
    isBlocked: Boolean!
    detectedBy: String!
    createdAt: String!
  }

  type Query {
    """
    Fetch the recent transactions for a given user.
    """
    recentTransactions(userId: String!, limit: Int): [Transaction!]!
    
    """
    Fetch recent fraud alerts for the system dashboard.
    """
    recentFraudAlerts(limit: Int): [FraudAlert!]!
  }
`;

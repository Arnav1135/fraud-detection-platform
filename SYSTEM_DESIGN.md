# Real-Time Fraud Detection & Duplicate Payment Prevention Platform

## 📌 Executive Summary
An enterprise-grade, highly scalable platform designed to process massive streams of financial transactions (100k+ TPS) and detect fraudulent patterns in real-time. Inspired by the O(n) "Two Sum" HashMap algorithm, this system utilizes sliding window hash maps, bloom filters, and distributed caching to identify duplicate payments, refund abuse, and suspicious paired transactions in **O(1) time complexity**.

## 🏗 System Architecture

The platform follows a **Microservices Architecture** utilizing **Domain-Driven Design (DDD)** and **CQRS**.

### High-Level Flow
1. **Ingestion Layer:** Transactions are ingested via an API Gateway (Kong/NGINX) and pushed to a highly partitioned **Apache Kafka** topic (`transactions.live`).
2. **Stream Processing (The Core Engine):** Node.js worker nodes consume the Kafka stream. They use an in-memory sliding-window HashMap (backed by **Redis**) to cross-reference transactions against recent history in O(1) time.
3. **AI Risk Scoring:** Suspicious transactions are asynchronously sent to an LLM/ML sidecar service to generate natural-language fraud explanations and risk scores.
4. **Persistence:** Raw transactions and fraud alerts are persisted in **PostgreSQL** (ACID compliance), while complex relationship graphs are synced to a Graph DB, and logs are shipped to **Elasticsearch**.
5. **Observability:** Metrics (latency, TPS, memory) are scraped by **Prometheus** and visualized in **Grafana**. Distributed tracing is handled by **OpenTelemetry**.

## 🧠 Core Algorithmic Engine: The "HashMap" Advantage

The heart of the system relies on advanced data structures to achieve sub-50ms latency.

### 1. The "Two Sum" Suspicious Pair Detection
Fraudsters often break down large transactions into smaller pairs to avoid flagging (e.g., trying to move exactly $10,000 by moving $4,500 and then $5,500). 
Similar to the Two Sum problem, as a transaction $T_x$ arrives, the engine calculates the "complement" needed to breach a threshold, and checks a time-windowed HashMap `O(1)` to see if the complement recently occurred from the same IP/Device.

### 2. O(1) Duplicate Payment Detection
Using a combination of a **Bloom Filter** (for fast negative lookups) and a **Sliding Window Hash Map** (for exact matching of idempotency keys, amounts, and recipient hashes), the system rejects duplicate charges instantly.

## 🗄️ Database Schema (PostgreSQL)

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    amount DECIMAL(18, 4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    risk_score INT NOT NULL,
    rule_triggered VARCHAR(100) NOT NULL,
    ai_explanation TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Deployment & DevOps

- **Containerization:** Fully Dockerized microservices.
- **Orchestration:** Kubernetes (K8s) for auto-scaling worker nodes based on Kafka lag.
- **CI/CD:** GitHub Actions pipeline running Jest unit tests, SonarQube static analysis, and deploying to AWS EKS.

---
*Built with Node.js, TypeScript, Redis, Kafka, and Clean Architecture.*

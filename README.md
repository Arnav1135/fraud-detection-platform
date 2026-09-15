# 🛡️ Real-Time Fraud Detection Engine (Enterprise Architecture)

An enterprise-grade, highly scalable platform designed to process massive streams of financial transactions (100k+ TPS) and detect fraudulent patterns in real-time.

![Architecture: Clean Architecture, Microservices, Event-Driven](https://img.shields.io/badge/Architecture-Clean%20%7C%20Event--Driven-blue)
![Stack: Node.js, TypeScript, Kafka, Redis, Kubernetes, Terraform](https://img.shields.io/badge/Stack-Node.js%20%7C%20TypeScript%20%7C%20Kafka%20%7C%20Redis%20%7C%20K8s-success)
![CI/CD: GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-orange)

## 🚀 The Core Engineering Problem

Fraudsters frequently use tactics like "Structuring" or "Smurfing"—breaking large illegal transactions into smaller ones to avoid detection and regulatory reporting thresholds (e.g., $10,000 limits).

To combat this at scale without tanking database performance, this engine implements concepts inspired by the **O(n) Two Sum Algorithm**:
1. As a transaction streams in, it calculates the "complement" needed to breach a fraud threshold.
2. It performs an **O(1) lookup** against a **Redis Sliding Window Cache** to see if that complement recently occurred from the same user/IP.
3. If a match is found, an **AI Agent (LLM)** instantly generates a human-readable investigation report, and the alert is broadcasted via **WebSockets** to a Security Operations Center (SOC) dashboard.

## 🏗️ System Architecture

This project is built to the standards of a **Principal/Staff Engineer (L6/L7)**, utilizing:
- **Clean Architecture & DDD:** Domain logic is fully decoupled from infrastructure via strict interface dependency injection.
- **Event-Driven Streaming:** Ingests live data via **Apache Kafka**, decoupling ingestion from processing.
- **Distributed Caching:** Uses **Redis** for probabilistic Bloom Filters (memory-efficient duplicate detection) and O(1) sliding windows.
- **Infrastructure as Code (IaC):** AWS infrastructure is defined natively in **Terraform** (`terraform/main.tf`).
- **Cloud-Native Deployments:** Containerized via Docker and orchestrated with **Kubernetes (K8s)**. Features a Horizontal Pod Autoscaler (`k8s/hpa.yaml`).
- **Observability:** Exposes a `/metrics` endpoint using `prom-client` for **Prometheus / Grafana** integration.
- **CI/CD:** Automated testing and Docker image builds via **GitHub Actions**.

## 💻 Running the Platform Locally

1. **Spin up the Infrastructure (Kafka, Zookeeper, Redis, Postgres):**
   ```bash
   docker-compose up -d
   ```
2. **Start the Fraud Engine:**
   ```bash
   cd backend
   npm install
   npm run start
   ```
3. **Run the Algorithm Test Suite:**
   ```bash
   npm run test
   ```

## 📡 Live Telemetry & Dashboards

- **Prometheus Metrics:** Available at `http://localhost:3000/metrics`
- **SOC WebSocket Stream:** Connect a client to `ws://localhost:3000` to stream real-time JSON fraud alerts and AI explanations.

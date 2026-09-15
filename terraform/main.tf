terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# ----------------------------------------------------
# 1. Amazon MSK (Managed Streaming for Apache Kafka)
# ----------------------------------------------------
resource "aws_msk_cluster" "fraud_kafka" {
  cluster_name           = "fraud-streaming-cluster"
  kafka_version          = "2.8.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type = "kafka.m5.large"
    client_subnets = ["subnet-xyz1", "subnet-xyz2", "subnet-xyz3"]
    security_groups = ["sg-fraud-kafka"]
  }
}

# ----------------------------------------------------
# 2. Amazon ElastiCache (Redis for O(1) Fraud Lookups)
# ----------------------------------------------------
resource "aws_elasticache_cluster" "fraud_redis" {
  cluster_id           = "fraud-cache"
  engine               = "redis"
  node_type            = "cache.m5.large"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
}

# ----------------------------------------------------
# 3. Amazon EKS (Kubernetes Cluster for Node.js Engine)
# ----------------------------------------------------
resource "aws_eks_cluster" "fraud_compute" {
  name     = "fraud-engine-eks"
  role_arn = "arn:aws:iam::123456789012:role/EKSClusterRole"

  vpc_config {
    subnet_ids = ["subnet-xyz1", "subnet-xyz2"]
  }
}

# ApexPay Global

**AMDARI Internship Project**
Enterprise Microservices, Kubernetes (EKS), and DevSecOps on Jenkins

| | |
|---|---|
| Track | DevOps — Advanced Capstone (Final Project) |
| Duration | Two Weeks |
| Specialist | God'sfavour Braimah |
| Repository | [github.com/GfavourBraimah/apexpay-global](https://github.com/GfavourBraimah/apexpay-global) |

Start here: clone this repository before doing anything else.

---

## 1. Project Overview

This capstone project takes a FinTech payment platform and moves it from a basic setup to a production-style, cloud-native architecture.

Over two weeks, you will:

- Build a 3-tier, zero-trust VPC in AWS.
- Deploy an Amazon EKS (Kubernetes) cluster.
- Build a full CI/CD pipeline using Jenkins.

Earlier versions of this project ran on plain EC2 servers with a free DuckDNS domain. This version is different: traffic must pass through an AWS Application Load Balancer (ALB) protected by AWS WAF, and you need a real custom domain (for example, from Namecheap) so DNS resolves correctly.

### Company Brief

| Field | Details |
|---|---|
| Company | ApexPay Global |
| Sector | Financial Technology (FinTech) — Core Banking & Settlement |
| Infrastructure | Terraform, AWS EKS, RDS, WAF, ALB, Secrets Manager, Jenkins, Prometheus |
| Intern Track | DevOps — Advanced Capstone |
| Project Duration | Two Weeks |
| Difficulty | Advanced — senior-level production deployment experience |

---

## 2. The Problem

ApexPay Global processes multi-currency transactions and holds sensitive user balances. It started as a minimum viable product (MVP), and the engineering side has not kept pace with the business growing.

**Current state:** backend services and databases run on public-facing servers, and `.env` files with real secrets are stored directly in the codebase. The platform recently suffered a brute-force credential stuffing attack. Because there was no rate limiting at the edge and no automated security pipeline, the attack caused downtime and the company failed a PCI-DSS compliance audit.

### Root Cause Analysis

| Root Cause | Detail |
|---|---|
| No edge security | Traffic hits the servers directly with no Web Application Firewall (WAF), leaving APIs exposed to SQL injection, DDoS, and brute-force attacks. |
| Hardcoded secrets | Database passwords and JWT signing keys live inside `.env` files in the codebase — a major security risk. |
| Flat network architecture | The PostgreSQL database sits in a public subnet. One firewall misconfiguration could expose financial data to the internet. |
| Manual deployments | There is no CI/CD automation, no safe rollback process, and container images are never scanned for vulnerabilities before deployment. |

---

## 3. Project Objectives

By the end of this project, ApexPay's platform will run inside a Kubernetes cluster with no public exposure for internal components.

- **3-tier VPC via Terraform** — provision public (ALB/NAT), private (EKS nodes), and isolated (RDS database) subnets as code.
- **Enterprise edge security** — deploy an AWS ALB with AWS WAF v2 to enforce rate limiting and block fraud/DDoS traffic.
- **Zero-trust secrets** — store RDS credentials in AWS Secrets Manager and inject them into EKS pods using the External Secrets Operator.
- **DevSecOps on Jenkins** — build a Jenkins pipeline that runs an Aqua Trivy security scan before pushing images to ECR and deploying to Kubernetes.
- **Real domain routing** — register a custom domain and point it at the AWS ALB through Route 53 (DuckDNS does not work for ALB routing).
- **Full observability** — deploy Prometheus and Grafana via Helm, with Alertmanager sending alerts to Slack or Telegram on 500-level HTTP errors.

**Why this matters:** recruiters and hiring managers look for hands-on experience with Kubernetes (EKS), WAF, and Jenkins pipelines. Completing this project is proof you can handle the security, compliance, and deployment standards expected at large organizations.

---

## 4. Concepts You Need to Know

| Concept | Description | Status |
|---|---|---|
| AWS EKS (Kubernetes) | Managed container orchestration. Replaces `docker compose` with self-healing pods, deployments, and services. | New |
| AWS WAF v2 | A web application firewall at the edge that blocks malicious traffic and enforces rate limits before requests reach the app. | New |
| Jenkins Pipeline as Code | Writing CI/CD workflows as a `Jenkinsfile` that builds, scans, and deploys the infrastructure. | New |
| AWS Secrets Manager | Centralized, encrypted storage for database passwords, removing the need for `.env` files on servers. | New |
| Helm & Ingress | The Kubernetes package manager used to deploy the Nginx Ingress Controller and the observability stack. | New |
| 3-Tier Network Isolation | Separating public traffic, private application compute, and fully isolated database storage. | New |

---

## 5. Deliverables

| Ref | Deliverable | How It's Verified |
|---|---|---|
| D1 | 3-tier VPC & RDS | `terraform apply` succeeds. AWS Console confirms the RDS database sits in the isolated subnet with no public IP. |
| D2 | EKS cluster | `kubectl get nodes` shows healthy worker nodes running only in the private app subnets. |
| D3 | Domain registration | A custom domain (for example `.com` or `.xyz`) is purchased and routed to the AWS ALB. |
| D4 | AWS Secrets Manager | Pods pull `DATABASE_URL` dynamically. The pod YAML shows no hardcoded passwords. |
| D5 | AWS WAF rate limiting | Spamming `/api/auth/login` returns a `429 Too Many Requests` from WAF. |
| D6 | Kubernetes deployment | `kubectl get pods` shows the Auth, Ledger, and Frontend services running successfully. |
| D7 | DevSecOps Jenkinsfile | The Jenkins dashboard shows a successful build, including a passed Aqua Trivy scan stage. |
| D8 | GitOps automation | Pushing to `main` automatically triggers the Jenkins webhook and redeploys the EKS cluster. |
| D9 | Prometheus & Grafana | The Grafana dashboard shows live CPU, memory, and HTTP traffic metrics for the cluster. |
| D10 | Slack/Telegram alerts | Manually killing the Auth pod triggers a critical alert in the designated Slack or Telegram channel. |

---

## 6. Repository Structure

```
apexpay-global/
├── terraform/                   # IaC for 3-Tier VPC, RDS, EKS, WAF
│   ├── network.tf
│   ├── eks.tf
│   └── rds.tf
├── k8s/                         # Kubernetes manifests
│   ├── auth-deployment.yaml
│   ├── ledger-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
├── Jenkinsfile                  # Jenkins DevSecOps pipeline
├── services/                    # Application source code
│   ├── auth-service/
│   └── ledger-service/
└── frontend/                    # React SPA
```

---

## 7. Weekly Schedule

### Week 1 — Cloud Architecture & Zero-Trust Foundation

| Day | Focus |
|---|---|
| Day 1 (Mon) | Clone the GitHub repository. Purchase a custom domain. Write Terraform to provision the 3-tier VPC and NAT gateways. |
| Day 2 (Tue) | Extend Terraform to provision the Amazon RDS PostgreSQL database (isolated subnet) and AWS Secrets Manager. |
| Day 3 (Wed) | Provision the AWS EKS cluster and worker node groups with Terraform. Update your local `kubeconfig`. |
| Day 4 (Thu) | Deploy the External Secrets Operator to sync AWS Secrets Manager credentials into Kubernetes securely. |
| Day 5 (Fri) | Provision the AWS ALB and attach the AWS WAF WebACL with rate-limiting rules. Map your custom domain. |

### Week 2 — Jenkins CI/CD, Observability & Final Deployment

| Day | Focus |
|---|---|
| Day 6 (Mon) | Spin up a Jenkins server on an EC2 instance. Connect it to your GitHub repository with webhooks. |
| Day 7 (Tue) | Write the `Jenkinsfile`. Configure the Docker build, Aqua Trivy security scan, and ECR push stages. |
| Day 8 (Wed) | Write the Kubernetes deployment and service YAML manifests. Add the final `kubectl apply` stage to Jenkins. |
| Day 9 (Thu) | Deploy Prometheus and Grafana into the EKS cluster using Helm charts. |
| Day 10 (Fri) | Configure Alertmanager for Slack/Telegram notifications. Run a live deployment test and a WAF rate-limit test. Mentor sign-off. |

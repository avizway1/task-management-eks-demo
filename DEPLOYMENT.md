# Deployment Guide

## Prerequisites

- AWS CLI configured
- kubectl installed and configured for your EKS cluster
- Docker installed
- Node.js 18+ (for local development)

## Local Development

1. **Start all services with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - User Service: http://localhost:3001
   - Task Service: http://localhost:3002
   - Notification Service: http://localhost:3003

3. **Stop services:**
   ```bash
   docker-compose down
   ```

## Production Deployment to EKS

### Step 1: Update Configuration

1. **Update registry URLs** in `scripts/build-and-push.sh`:
   ```bash
   REGISTRY="your-account.dkr.ecr.us-west-2.amazonaws.com"
   ```

2. **Update image references** in all K8s manifests:
   ```yaml
   image: your-account.dkr.ecr.us-west-2.amazonaws.com/task-service:latest
   ```

3. **Update secrets** in `k8s/secrets.yaml` with base64 encoded values:
   ```bash
   echo -n "your-secret" | base64
   ```

### Step 2: Build and Push Images

```bash
# Login to ECR (if using ECR)
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-west-2.amazonaws.com

# Build and push all images
./scripts/build-and-push.sh
```

### Step 3: Deploy to EKS

```bash
# Make sure kubectl is configured
aws eks update-kubeconfig --region us-west-2 --name your-cluster-name

# Deploy the application
./scripts/deploy-to-eks.sh
```

### Step 4: Verify Deployment

```bash
# Check pods
kubectl get pods -n task-management

# Check services
kubectl get services -n task-management

# Check ingress
kubectl get ingress -n task-management

# View logs
kubectl logs -f deployment/task-service -n task-management
```

## Scaling

```bash
# Manual scaling
kubectl scale deployment task-service --replicas=5 -n task-management

# Check HPA status
kubectl get hpa -n task-management
```

## Monitoring

```bash
# Port forward to access services locally
kubectl port-forward service/frontend-service 3000:80 -n task-management

# Check health endpoints
curl http://localhost:3001/health  # User service
curl http://localhost:3002/health  # Task service
curl http://localhost:3003/health  # Notification service
```

## Troubleshooting

### Common Issues

1. **Pods not starting:**
   ```bash
   kubectl describe pod <pod-name> -n task-management
   ```

2. **Database connection issues:**
   ```bash
   kubectl logs deployment/postgres -n task-management
   ```

3. **Service discovery problems:**
   ```bash
   kubectl get endpoints -n task-management
   ```

### Useful Commands

```bash
# Get all resources
kubectl get all -n task-management

# Delete deployment
kubectl delete -f k8s/

# Restart deployment
kubectl rollout restart deployment/task-service -n task-management

# Access pod shell
kubectl exec -it <pod-name> -n task-management -- /bin/sh
```
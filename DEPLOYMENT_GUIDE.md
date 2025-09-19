# Task Management System - Complete EKS Deployment Guide

## 📋 Prerequisites

### Required Tools
```bash
# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Docker
# Install Docker Desktop or Docker Engine
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (e.g., ap-south-1), Output format (json)

# Verify configuration
aws sts get-caller-identity
```

## 🏗️ Project Structure
```
task-management-eks-demo/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── user-service/
│   ├── Dockerfile
│   ├── package.json
│   └── routes/
├── task-service/
│   ├── Dockerfile
│   ├── package.json
│   └── routes/
├── notification-service/
│   ├── Dockerfile
│   ├── package.json
│   └── routes/
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── mongodb.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── user-service.yaml
│   ├── task-service.yaml
│   ├── notification-service.yaml
│   ├── frontend.yaml
│   └── ingress.yaml
└── docker-compose.yml
```

## 🐳 Docker Images

### 1. Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. User Service Dockerfile
```dockerfile
# user-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### 3. Task Service Dockerfile
```dockerfile
# task-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["node", "server.js"]
```

### 4. Notification Service Dockerfile
```dockerfile
# notification-service/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3003
CMD ["node", "server.js"]
```

## 🚀 Step-by-Step Deployment

### Step 1: Create EKS Cluster
```bash
# Create EKS cluster (15-20 minutes)
eksctl create cluster \
  --name task-management-cluster \
  --region ap-south-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 4 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed

# Verify cluster
kubectl get nodes
```

### Step 2: Setup ECR Repositories
```bash
# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-south-1

# Create ECR repositories
aws ecr create-repository --repository-name task-management/frontend --region $REGION
aws ecr create-repository --repository-name task-management/user-service --region $REGION
aws ecr create-repository --repository-name task-management/task-service --region $REGION
aws ecr create-repository --repository-name task-management/notification-service --region $REGION

# Login to ECR
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
```

### Step 3: Build and Push Docker Images
```bash
# Set registry URL
REGISTRY=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build and push frontend
cd frontend
docker build -t task-management/frontend .
docker tag task-management/frontend:latest $REGISTRY/task-management/frontend:latest
docker push $REGISTRY/task-management/frontend:latest

# Build and push user-service
cd ../user-service
docker build -t task-management/user-service .
docker tag task-management/user-service:latest $REGISTRY/task-management/user-service:latest
docker push $REGISTRY/task-management/user-service:latest

# Build and push task-service
cd ../task-service
docker build -t task-management/task-service .
docker tag task-management/task-service:latest $REGISTRY/task-management/task-service:latest
docker push $REGISTRY/task-management/task-service:latest

# Build and push notification-service
cd ../notification-service
docker build -t task-management/notification-service .
docker tag task-management/notification-service:latest $REGISTRY/task-management/notification-service:latest
docker push $REGISTRY/task-management/notification-service:latest

cd ..
```

### Step 4: Create Kubernetes Manifests

#### Namespace and ConfigMap
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: task-management

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: task-management
data:
  NODE_ENV: "production"
  MONGODB_DB: "taskmanager"
  POSTGRES_DB: "taskmanager"
```

#### Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: task-management
type: Opaque
data:
  JWT_SECRET: c3VwZXJzZWNyZXRqd3R0b2tlbmZvcnRhc2ttYW5hZ2VtZW50 # base64 encoded
  MONGODB_URI: bW9uZ29kYjovL21vbmdvZGItc2VydmljZToyNzAxNy90YXNrbWFuYWdlcg== # base64 encoded
  POSTGRES_URI: cG9zdGdyZXNxbDovL3Rhc2t1c2VyOnRhc2twYXNzd29yZEBwb3N0Z3Jlcy1zZXJ2aWNlOjU0MzIvdGFza21hbmFnZXI= # base64 encoded
```

#### Database Services
```yaml
# k8s/mongodb.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: task-management
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:7-jammy
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_DATABASE
          value: taskmanager
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "400m"
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: task-management
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
```

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: task-management
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: taskmanager
        - name: POSTGRES_USER
          value: taskuser
        - name: POSTGRES_PASSWORD
          value: taskpassword
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: task-management
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: task-management
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: task-management
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

#### Application Services
```yaml
# k8s/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: task-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: user-service
        image: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/task-management/user-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: MONGODB_URI
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: task-management
spec:
  selector:
    app: user-service
  ports:
  - port: 3001
    targetPort: 3001
```

```yaml
# k8s/task-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-service
  namespace: task-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: task-service
  template:
    metadata:
      labels:
        app: task-service
    spec:
      containers:
      - name: task-service
        image: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/task-management/task-service:latest
        ports:
        - containerPort: 3002
        env:
        - name: PORT
          value: "3002"
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: POSTGRES_URI
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: POSTGRES_URI
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        - name: USER_SERVICE_URL
          value: "http://user-service:3001"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: task-service
  namespace: task-management
spec:
  selector:
    app: task-service
  ports:
  - port: 3002
    targetPort: 3002
```

```yaml
# k8s/notification-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: task-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
      - name: notification-service
        image: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/task-management/notification-service:latest
        ports:
        - containerPort: 3003
        env:
        - name: PORT
          value: "3003"
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: REDIS_HOST
          value: "redis-service"
        - name: REDIS_PORT
          value: "6379"
        - name: USER_SERVICE_URL
          value: "http://user-service:3001"
        - name: SMTP_HOST
          value: "smtp.gmail.com"
        - name: SMTP_PORT
          value: "587"
        - name: SMTP_USER
          value: "your-email@gmail.com"
        - name: SMTP_PASS
          value: "your-app-password"
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
  namespace: task-management
spec:
  selector:
    app: notification-service
  ports:
  - port: 3003
    targetPort: 3003
```

```yaml
# k8s/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: task-management
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/task-management/frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "32Mi"
            cpu: "25m"
          limits:
            memory: "64Mi"
            cpu: "50m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: task-management
spec:
  selector:
    app: frontend
  ports:
  - port: 80
    targetPort: 80
```

#### Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: task-management-ingress
  namespace: task-management
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: "30"
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=60
spec:
  rules:
  - http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 3001
      - path: /api/users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 3001
      - path: /api/tasks
        pathType: Prefix
        backend:
          service:
            name: task-service
            port:
              number: 3002
      - path: /api/notifications
        pathType: Prefix
        backend:
          service:
            name: notification-service
            port:
              number: 3003
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

### Step 5: Install AWS Load Balancer Controller
```bash
# Create IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.4.4/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=task-management-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name "AmazonEKSLoadBalancerControllerRole" \
  --attach-policy-arn=arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=task-management-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### Step 6: Deploy Application
```bash
# Update image URLs in manifests
sed -i "s/ACCOUNT_ID/$ACCOUNT_ID/g" k8s/*.yaml
sed -i "s/REGION/$REGION/g" k8s/*.yaml

# IMPORTANT: Configure Gmail SMTP before deploying
# Replace with your actual Gmail credentials in k8s/notification-service.yaml:
# SMTP_USER: your-email@gmail.com
# SMTP_PASS: your-16-character-app-password

# Deploy all resources
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/task-service.yaml
kubectl apply -f k8s/notification-service.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## 📧 Gmail SMTP Configuration

### Prerequisites for Email Notifications
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password** for the application

### Step-by-Step Gmail Setup

#### 1. Enable 2-Factor Authentication
- Go to [Google Account Security](https://myaccount.google.com/security)
- Enable "2-Step Verification" if not already enabled

#### 2. Generate App Password
- In Google Account Security → "2-Step Verification"
- Scroll to "App passwords"
- Click "Select app" → Choose "Mail"
- Click "Select device" → Choose "Other (Custom name)"
- Enter "Task Management System"
- Click "Generate"
- **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)

#### 3. Update Kubernetes Configuration
```bash
# Method 1: Update before deployment
# Edit k8s/notification-service.yaml or k8s-all-in-one.yaml
# Replace:
# SMTP_USER: "your-email@gmail.com"
# SMTP_PASS: "your-app-password"

# Method 2: Update after deployment
kubectl set env deployment/notification-service -n task-management \
  SMTP_USER=your-email@gmail.com \
  SMTP_PASS=your-16-char-app-password
```

#### 4. Test Email Configuration
```bash
# Test via API
curl -X POST http://$INGRESS_URL/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"to": "your-email@gmail.com"}'

# Or test via frontend
# Login → Notifications → "Send Test Email to Me"
```

### Step 7: Verify Deployment
```bash
# Check all pods are running
kubectl get pods -n task-management

# Check services
kubectl get svc -n task-management

# Get ingress URL
kubectl get ingress -n task-management

# Check logs
kubectl logs -l app=user-service -n task-management
kubectl logs -l app=task-service -n task-management
kubectl logs -l app=notification-service -n task-management
```

## 🧪 Testing

### API Testing
```bash
# Get the load balancer URL
INGRESS_URL=$(kubectl get ingress task-management-ingress -n task-management -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test user registration
curl -X POST http://$INGRESS_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test task creation (use token from registration response)
curl -X POST http://$INGRESS_URL/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Task",
    "description": "This is a test task",
    "priority": "high",
    "status": "pending"
  }'
```

### Frontend Testing
```bash
# Access the application
echo "Application URL: http://$INGRESS_URL"
```

## 🔧 Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl describe pod POD_NAME -n task-management

# Check resource constraints
kubectl top nodes
kubectl top pods -n task-management
```

#### Database Connection Issues
```bash
# Check database pods
kubectl logs -l app=mongodb -n task-management
kubectl logs -l app=postgres -n task-management
kubectl logs -l app=redis -n task-management

# Test connectivity
kubectl exec -it POD_NAME -n task-management -- nc -zv mongodb-service 27017
```

#### Ingress Issues
```bash
# Check ingress status
kubectl describe ingress task-management-ingress -n task-management

# Check load balancer controller
kubectl logs -n kube-system deployment.apps/aws-load-balancer-controller
```

### Scaling
```bash
# Scale services
kubectl scale deployment user-service --replicas=3 -n task-management
kubectl scale deployment task-service --replicas=3 -n task-management

# Scale cluster nodes
eksctl scale nodegroup --cluster=task-management-cluster --nodes=6 --name=standard-workers
```

### Cleanup
```bash
# Delete application
kubectl delete namespace task-management

# Delete cluster
eksctl delete cluster --name task-management-cluster --region ap-south-1

# Delete ECR repositories
aws ecr delete-repository --repository-name task-management/frontend --force --region ap-south-1
aws ecr delete-repository --repository-name task-management/user-service --force --region ap-south-1
aws ecr delete-repository --repository-name task-management/task-service --force --region ap-south-1
aws ecr delete-repository --repository-name task-management/notification-service --force --region ap-south-1
```

## 🔧 MongoDB Configuration Notes

### Readiness Probe Issue
The MongoDB deployment has been configured **without a readiness probe** to prevent startup issues. The default MongoDB readiness probe can cause timeouts during cluster initialization.

**If MongoDB pods show as "Not Ready":**
```bash
# Remove readiness probe from running deployment
kubectl patch deployment mongodb -n task-management -p '{"spec":{"template":{"spec":{"containers":[{"name":"mongodb","readinessProbe":null}]}}}}'

# Or restart the deployment
kubectl rollout restart deployment mongodb -n task-management
```

**Why this happens:**
- MongoDB takes time to initialize on first startup
- The `mongosh --eval "db.adminCommand('ping')"` command may timeout
- Removing the probe allows MongoDB to start normally while maintaining functionality

## 📊 Monitoring (Optional)

### Install Prometheus and Grafana
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default login: admin/prom-operator
```

## 🎯 Summary

This guide covers:
- ✅ Complete EKS cluster setup
- ✅ Docker image building and ECR deployment
- ✅ Kubernetes manifests for all services
- ✅ Load balancer and ingress configuration
- ✅ Database setup (MongoDB, PostgreSQL, Redis)
- ✅ Application deployment and verification
- ✅ Testing and troubleshooting

**Total deployment time: ~30-45 minutes**
**Estimated cost: ~$50-100/month for t3.medium nodes**

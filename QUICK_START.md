# 🚀 Quick Start Guide

## One-Command Deployment

```bash
# Make script executable and run
chmod +x deploy-all-in-one.sh
./deploy-all-in-one.sh

# IMPORTANT: Configure Gmail SMTP after deployment
kubectl set env deployment/notification-service -n task-management \
  SMTP_USER=your-email@gmail.com \
  SMTP_PASS=your-16-char-app-password
```

## Step-by-Step Deployment

```bash
# 1. Create EKS cluster (15-20 minutes)
./deploy.sh cluster

# 2. Setup ECR repositories
./deploy.sh ecr

# 3. Build and push Docker images (5-10 minutes)
./deploy.sh build

# 4. Install AWS Load Balancer Controller
./deploy.sh alb

# 5. Deploy application (5-10 minutes)
./deploy.sh deploy

# 6. Configure Gmail SMTP (REQUIRED for notifications)
kubectl set env deployment/notification-service -n task-management \
  SMTP_USER=your-email@gmail.com \
  SMTP_PASS=your-app-password

# 7. Verify deployment
./deploy.sh verify
```

## 📧 Gmail SMTP Setup (Required)

### Quick Setup:
1. **Enable 2FA** on Gmail
2. **Generate App Password**: Google Account → Security → App passwords → Mail
3. **Update deployment**:
```bash
kubectl set env deployment/notification-service -n task-management \
  SMTP_USER=your-email@gmail.com \
  SMTP_PASS=your-16-char-app-password
```

### Test Email:
- Login to app → Notifications → "Send Test Email to Me"

## Prerequisites

```bash
# Install required tools
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl

curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Configure AWS
aws configure
```

## Expected Timeline

- **Total Time**: 30-45 minutes
- **Cluster Creation**: 15-20 minutes
- **Image Building**: 5-10 minutes  
- **Application Deployment**: 5-10 minutes
- **Verification**: 2-5 minutes

## Cost Estimate

- **t3.medium nodes (4)**: ~$50-70/month
- **Load Balancer**: ~$20/month
- **Total**: ~$70-90/month

## Cleanup

```bash
# Delete everything
kubectl delete namespace task-management
eksctl delete cluster --name task-management-cluster --region ap-south-1
```

## Troubleshooting

```bash
# Check pod status
kubectl get pods -n task-management

# Check logs
kubectl logs -l app=user-service -n task-management

# Get application URL
kubectl get ingress -n task-management
```

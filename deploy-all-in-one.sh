#!/bin/bash

# Task Management System - All-in-One Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Task Management System - All-in-One Deployment${NC}"
echo "========================================================="

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_DEFAULT_REGION:-ap-south-1}

echo -e "${YELLOW}🏗️ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${YELLOW}🌍 Region: $REGION${NC}"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ kubectl is not configured or cluster is not accessible${NC}"
    echo "Please ensure your EKS cluster is running and kubectl is configured"
    exit 1
fi

echo -e "${YELLOW}📝 Updating manifest with your AWS account details...${NC}"

# Create a temporary manifest with updated values
cp k8s-all-in-one.yaml k8s-all-in-one-temp.yaml
sed -i.bak "s/ACCOUNT_ID/$ACCOUNT_ID/g" k8s-all-in-one-temp.yaml
sed -i.bak "s/REGION/$REGION/g" k8s-all-in-one-temp.yaml

echo -e "${YELLOW}📧 SMTP Configuration Required for Email Notifications${NC}"
echo -e "${YELLOW}Current SMTP settings in manifest:${NC}"
echo "  SMTP_USER: your-email@gmail.com"
echo "  SMTP_PASS: your-app-password"
echo ""
echo -e "${YELLOW}To configure Gmail SMTP:${NC}"
echo "1. Enable 2FA on Gmail"
echo "2. Generate App Password: Google Account → Security → App passwords"
echo "3. Update the manifest or use this command after deployment:"
echo "   kubectl set env deployment/notification-service -n task-management \\"
echo "     SMTP_USER=your-email@gmail.com \\"
echo "     SMTP_PASS=your-16-char-app-password"
echo ""
read -p "Press Enter to continue with deployment..."

echo -e "${YELLOW}🚀 Deploying all resources...${NC}"

# Deploy the manifest
kubectl apply -f k8s-all-in-one-temp.yaml

echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"

# Fix MongoDB readiness probe issue
echo "Fixing MongoDB readiness probe..."
kubectl patch deployment mongodb -n task-management -p '{"spec":{"template":{"spec":{"containers":[{"name":"mongodb","readinessProbe":null}]}}}}' 2>/dev/null || true

kubectl wait --for=condition=ready pod -l app=mongodb -n task-management --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n task-management --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n task-management --timeout=300s

echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=user-service -n task-management --timeout=300s
kubectl wait --for=condition=ready pod -l app=task-service -n task-management --timeout=300s
kubectl wait --for=condition=ready pod -l app=notification-service -n task-management --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n task-management --timeout=300s

echo -e "${GREEN}✅ All resources deployed successfully!${NC}"

# Clean up temporary files
rm -f k8s-all-in-one-temp.yaml k8s-all-in-one-temp.yaml.bak

echo -e "${YELLOW}🔍 Checking deployment status...${NC}"

# Show pod status
echo -e "\n📦 Pod Status:"
kubectl get pods -n task-management

# Show service status
echo -e "\n🔗 Service Status:"
kubectl get svc -n task-management

# Get ingress URL
echo -e "\n🌐 Getting application URL..."
sleep 30
INGRESS_URL=$(kubectl get ingress task-management-ingress -n task-management -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)

if [ -n "$INGRESS_URL" ]; then
    echo -e "${GREEN}🎉 Application URL: http://$INGRESS_URL${NC}"
    echo -e "${YELLOW}📝 Note: It may take 2-3 minutes for the load balancer to be fully ready${NC}"
else
    echo -e "${YELLOW}⏳ Ingress URL not ready yet. Check later with:${NC}"
    echo "kubectl get ingress task-management-ingress -n task-management"
fi

echo -e "\n${GREEN}🎯 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Wait 2-3 minutes for load balancer to be ready"
echo "2. Access your application at the URL above"
echo "3. Test registration and task creation"

echo -e "\n${YELLOW}🧪 To test the API:${NC}"
echo "curl -X POST http://\$INGRESS_URL/api/auth/register \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"username\":\"test\",\"email\":\"test@example.com\",\"password\":\"test123\",\"firstName\":\"Test\",\"lastName\":\"User\"}'"

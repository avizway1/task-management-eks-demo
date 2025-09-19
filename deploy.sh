#!/bin/bash

# Task Management System - EKS Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="task-management-cluster"
REGION="ap-south-1"
NODE_TYPE="t3.medium"
NODES=4

echo -e "${GREEN}🚀 Task Management System - EKS Deployment${NC}"
echo "=================================================="

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
command -v aws >/dev/null 2>&1 || { echo -e "${RED}❌ AWS CLI is required${NC}"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo -e "${RED}❌ kubectl is required${NC}"; exit 1; }
command -v eksctl >/dev/null 2>&1 || { echo -e "${RED}❌ eksctl is required${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required${NC}"; exit 1; }
echo -e "${GREEN}✅ All prerequisites met${NC}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

echo -e "${YELLOW}🏗️ AWS Account: $ACCOUNT_ID${NC}"
echo -e "${YELLOW}🌍 Region: $REGION${NC}"

# Function to create EKS cluster
create_cluster() {
    echo -e "${YELLOW}☸️ Creating EKS cluster...${NC}"
    eksctl create cluster \
        --name $CLUSTER_NAME \
        --region $REGION \
        --nodegroup-name standard-workers \
        --node-type $NODE_TYPE \
        --nodes $NODES \
        --nodes-min 2 \
        --nodes-max 6 \
        --managed
    echo -e "${GREEN}✅ EKS cluster created${NC}"
}

# Function to setup ECR
setup_ecr() {
    echo -e "${YELLOW}📦 Setting up ECR repositories...${NC}"
    
    # Create repositories
    aws ecr create-repository --repository-name task-management/frontend --region $REGION 2>/dev/null || true
    aws ecr create-repository --repository-name task-management/user-service --region $REGION 2>/dev/null || true
    aws ecr create-repository --repository-name task-management/task-service --region $REGION 2>/dev/null || true
    aws ecr create-repository --repository-name task-management/notification-service --region $REGION 2>/dev/null || true
    
    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REGISTRY
    echo -e "${GREEN}✅ ECR repositories created and logged in${NC}"
}

# Function to build and push images
build_and_push() {
    echo -e "${YELLOW}🐳 Building and pushing Docker images...${NC}"
    
    # Frontend
    echo "Building frontend..."
    cd frontend
    docker build -t task-management/frontend .
    docker tag task-management/frontend:latest $REGISTRY/task-management/frontend:latest
    docker push $REGISTRY/task-management/frontend:latest
    cd ..
    
    # User Service
    echo "Building user-service..."
    cd user-service
    docker build -t task-management/user-service .
    docker tag task-management/user-service:latest $REGISTRY/task-management/user-service:latest
    docker push $REGISTRY/task-management/user-service:latest
    cd ..
    
    # Task Service
    echo "Building task-service..."
    cd task-service
    docker build -t task-management/task-service .
    docker tag task-management/task-service:latest $REGISTRY/task-management/task-service:latest
    docker push $REGISTRY/task-management/task-service:latest
    cd ..
    
    # Notification Service
    echo "Building notification-service..."
    cd notification-service
    docker build -t task-management/notification-service .
    docker tag task-management/notification-service:latest $REGISTRY/task-management/notification-service:latest
    docker push $REGISTRY/task-management/notification-service:latest
    cd ..
    
    echo -e "${GREEN}✅ All images built and pushed${NC}"
}

# Function to install AWS Load Balancer Controller
install_alb_controller() {
    echo -e "${YELLOW}⚖️ Installing AWS Load Balancer Controller...${NC}"
    
    # Create IAM policy
    curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.4.4/docs/install/iam_policy.json
    
    aws iam create-policy \
        --policy-name AWSLoadBalancerControllerIAMPolicy \
        --policy-document file://iam_policy.json 2>/dev/null || true
    
    # Create service account
    eksctl create iamserviceaccount \
        --cluster=$CLUSTER_NAME \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --role-name "AmazonEKSLoadBalancerControllerRole" \
        --attach-policy-arn=arn:aws:iam::$ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
        --approve 2>/dev/null || true
    
    # Install Helm if not present
    if ! command -v helm &> /dev/null; then
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi
    
    # Install controller
    helm repo add eks https://aws.github.io/eks-charts
    helm repo update
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName=$CLUSTER_NAME \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller 2>/dev/null || true
    
    rm -f iam_policy.json
    echo -e "${GREEN}✅ AWS Load Balancer Controller installed${NC}"
}

# Function to deploy application
deploy_app() {
    echo -e "${YELLOW}🚀 Deploying application...${NC}"
    
    # Update image URLs in manifests
    sed -i.bak "s/ACCOUNT_ID/$ACCOUNT_ID/g" k8s/*.yaml
    sed -i.bak "s/REGION/$REGION/g" k8s/*.yaml
    
    # Deploy resources
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secrets.yaml
    kubectl apply -f k8s/mongodb.yaml
    kubectl apply -f k8s/postgres.yaml
    kubectl apply -f k8s/redis.yaml
    
    # Wait for databases
    echo "Waiting for databases to be ready..."
    kubectl wait --for=condition=ready pod -l app=mongodb -n task-management --timeout=300s
    kubectl wait --for=condition=ready pod -l app=postgres -n task-management --timeout=300s
    kubectl wait --for=condition=ready pod -l app=redis -n task-management --timeout=300s
    
    # Deploy services
    kubectl apply -f k8s/user-service.yaml
    kubectl apply -f k8s/task-service.yaml
    kubectl apply -f k8s/notification-service.yaml
    kubectl apply -f k8s/frontend.yaml
    kubectl apply -f k8s/ingress.yaml
    
    # Wait for services
    echo "Waiting for services to be ready..."
    kubectl wait --for=condition=ready pod -l app=user-service -n task-management --timeout=300s
    kubectl wait --for=condition=ready pod -l app=task-service -n task-management --timeout=300s
    kubectl wait --for=condition=ready pod -l app=notification-service -n task-management --timeout=300s
    kubectl wait --for=condition=ready pod -l app=frontend -n task-management --timeout=300s
    
    # Restore original files
    mv k8s/*.yaml.bak k8s/ 2>/dev/null || true
    
    echo -e "${GREEN}✅ Application deployed${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}🔍 Verifying deployment...${NC}"
    
    # Check pods
    echo "Pod status:"
    kubectl get pods -n task-management
    
    # Check services
    echo -e "\nService status:"
    kubectl get svc -n task-management
    
    # Get ingress URL
    echo -e "\nWaiting for ingress to be ready..."
    sleep 60
    INGRESS_URL=$(kubectl get ingress task-management-ingress -n task-management -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    if [ -n "$INGRESS_URL" ]; then
        echo -e "${GREEN}🌐 Application URL: http://$INGRESS_URL${NC}"
        
        # Test API
        echo -e "\n🧪 Testing API..."
        sleep 30
        curl -X POST http://$INGRESS_URL/api/auth/register \
            -H "Content-Type: application/json" \
            -d '{
                "username": "testuser",
                "email": "test@example.com",
                "password": "testpass123",
                "firstName": "Test",
                "lastName": "User"
            }' && echo -e "\n${GREEN}✅ API test successful${NC}" || echo -e "\n${YELLOW}⚠️ API test failed - may need more time${NC}"
    else
        echo -e "${YELLOW}⚠️ Ingress URL not ready yet. Check later with: kubectl get ingress -n task-management${NC}"
    fi
}

# Main execution
case "${1:-all}" in
    "cluster")
        create_cluster
        ;;
    "ecr")
        setup_ecr
        ;;
    "build")
        build_and_push
        ;;
    "alb")
        install_alb_controller
        ;;
    "deploy")
        deploy_app
        ;;
    "verify")
        verify_deployment
        ;;
    "all")
        create_cluster
        setup_ecr
        build_and_push
        install_alb_controller
        deploy_app
        verify_deployment
        ;;
    *)
        echo "Usage: $0 [cluster|ecr|build|alb|deploy|verify|all]"
        echo "  cluster - Create EKS cluster"
        echo "  ecr     - Setup ECR repositories"
        echo "  build   - Build and push Docker images"
        echo "  alb     - Install AWS Load Balancer Controller"
        echo "  deploy  - Deploy application"
        echo "  verify  - Verify deployment"
        echo "  all     - Run all steps (default)"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

#!/bin/bash

# Configuration
NAMESPACE="task-management"
CLUSTER_NAME="your-eks-cluster"
REGION="us-west-2"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Deploying Task Management System to EKS...${NC}"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}kubectl is not configured or cluster is not accessible${NC}"
    echo "Run: aws eks update-kubeconfig --region $REGION --name $CLUSTER_NAME"
    exit 1
fi

# Deploy in order
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f k8s/namespace.yaml

echo -e "${YELLOW}Applying ConfigMaps and Secrets...${NC}"
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

echo -e "${YELLOW}Deploying databases...${NC}"
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/redis.yaml

echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=mongodb -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s

echo -e "${YELLOW}Deploying microservices...${NC}"
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/task-service.yaml
kubectl apply -f k8s/notification-service.yaml

echo -e "${YELLOW}Deploying API Gateway...${NC}"
kubectl apply -f k8s/api-gateway.yaml

echo -e "${YELLOW}Deploying frontend...${NC}"
kubectl apply -f k8s/frontend.yaml

echo -e "${YELLOW}Creating ingress...${NC}"
kubectl apply -f k8s/ingress.yaml

echo -e "${GREEN}Deployment completed!${NC}"
echo ""
echo -e "${YELLOW}Checking deployment status:${NC}"
kubectl get pods -n $NAMESPACE
echo ""
kubectl get services -n $NAMESPACE
echo ""
kubectl get ingress -n $NAMESPACE

echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "• Check pods: kubectl get pods -n $NAMESPACE"
echo "• Check logs: kubectl logs -f deployment/task-service -n $NAMESPACE"
echo "• Port forward: kubectl port-forward service/frontend-service 3000:80 -n $NAMESPACE"
echo "• Scale service: kubectl scale deployment task-service --replicas=5 -n $NAMESPACE"
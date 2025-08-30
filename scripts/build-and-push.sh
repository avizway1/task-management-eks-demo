#!/bin/bash

# Configuration
REGISTRY="your-registry"  # Replace with your ECR/DockerHub registry
TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building and pushing Task Management System images...${NC}"

# Function to build and push image
build_and_push() {
    local service=$1
    local dockerfile_path=$2
    
    echo -e "${YELLOW}Building $service...${NC}"
    
    if docker build -t $REGISTRY/$service:$TAG $dockerfile_path; then
        echo -e "${GREEN}✓ Built $service successfully${NC}"
        
        echo -e "${YELLOW}Pushing $service to registry...${NC}"
        if docker push $REGISTRY/$service:$TAG; then
            echo -e "${GREEN}✓ Pushed $service successfully${NC}"
        else
            echo -e "${RED}✗ Failed to push $service${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Failed to build $service${NC}"
        exit 1
    fi
    echo ""
}

# Build and push all services
build_and_push "task-frontend" "./frontend"
build_and_push "user-service" "./user-service"
build_and_push "task-service" "./task-service"
build_and_push "notification-service" "./notification-service"

echo -e "${GREEN}All images built and pushed successfully!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update image references in k8s manifests"
echo "2. Deploy to EKS: kubectl apply -f k8s/"
echo "3. Check deployment status: kubectl get pods -n task-management"
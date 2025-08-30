# Task Management System - EKS Microservices Demo

A comprehensive microservices-based task management application designed to demonstrate EKS skills, featuring:

## Architecture Overview
- **Frontend**: React.js with Material-UI
- **API Gateway**: Kong/Nginx for routing and load balancing
- **User Service**: Authentication & user management (Node.js + MongoDB)
- **Task Service**: Task CRUD operations (Node.js + PostgreSQL)
- **Notification Service**: Email/push notifications (Node.js + Redis)
- **Database**: PostgreSQL for tasks, MongoDB for users, Redis for caching

## Microservices Features
- Service discovery and communication
- Health checks and monitoring
- Horizontal pod autoscaling
- ConfigMaps and Secrets management
- Persistent volumes for databases
- Ingress controllers
- Service mesh capabilities

## EKS Skills Demonstrated
- Multi-tier application deployment
- Inter-service communication
- Database persistence
- Load balancing and scaling
- Security best practices
- Monitoring and logging
- CI/CD pipeline integration

## Quick Start
```bash
# Build and push images
./scripts/build-and-push.sh

# Deploy to EKS
kubectl apply -f k8s/

# Access the application
kubectl get ingress
```

## Services
- Frontend: Port 3000
- API Gateway: Port 8080
- User Service: Port 3001
- Task Service: Port 3002
- Notification Service: Port 3003
#!/bin/bash

# AWS SES Setup Script for Task Management System
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 AWS SES Setup for Task Management System${NC}"
echo "=================================================="

# Get configuration
REGION=${AWS_DEFAULT_REGION:-ap-south-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
CLUSTER_NAME=${CLUSTER_NAME:-"task-management-cluster"}

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  AWS Account: $ACCOUNT_ID"
echo "  Region: $REGION"
echo "  Cluster: $CLUSTER_NAME"
echo ""

# Prompt for email address
read -p "Enter the email address to use as sender (e.g., noreply@yourdomain.com): " FROM_EMAIL

if [ -z "$FROM_EMAIL" ]; then
    echo -e "${RED}❌ Email address is required${NC}"
    exit 1
fi

echo -e "${YELLOW}📧 Step 1: Verifying email address in SES...${NC}"
aws ses verify-email-identity --email-address "$FROM_EMAIL" --region "$REGION"
echo -e "${GREEN}✅ Verification email sent to $FROM_EMAIL${NC}"
echo -e "${YELLOW}⚠️  Please check your inbox and click the verification link${NC}"
echo ""

read -p "Press Enter after you've verified the email address..."

# Check verification status
echo -e "${YELLOW}🔍 Checking verification status...${NC}"
VERIFICATION_STATUS=$(aws ses get-identity-verification-attributes \
    --identities "$FROM_EMAIL" \
    --region "$REGION" \
    --query "VerificationAttributes.\"$FROM_EMAIL\".VerificationStatus" \
    --output text)

if [ "$VERIFICATION_STATUS" != "Success" ]; then
    echo -e "${RED}❌ Email not verified yet. Status: $VERIFICATION_STATUS${NC}"
    echo "Please verify the email and run this script again."
    exit 1
fi

echo -e "${GREEN}✅ Email verified successfully${NC}"
echo ""

echo -e "${YELLOW}📝 Step 2: Creating IAM policy for SES...${NC}"

# Create SES policy
cat > /tmp/ses-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota"
      ],
      "Resource": "*"
    }
  ]
}
EOF

aws iam create-policy \
    --policy-name TaskManagementSESPolicy \
    --policy-document file:///tmp/ses-policy.json 2>/dev/null || echo "Policy already exists"

echo -e "${GREEN}✅ IAM policy created${NC}"
echo ""

echo -e "${YELLOW}🔐 Step 3: Setting up IAM role for service account...${NC}"

# Get OIDC provider
OIDC_PROVIDER=$(aws eks describe-cluster --name "$CLUSTER_NAME" --region "$REGION" \
    --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///")

# Create trust policy
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:task-management-docker:notification-service-sa",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create IAM role
aws iam create-role \
    --role-name TaskManagementSESRole \
    --assume-role-policy-document file:///tmp/trust-policy.json 2>/dev/null || echo "Role already exists"

# Attach policy to role
aws iam attach-role-policy \
    --role-name TaskManagementSESRole \
    --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/TaskManagementSESPolicy"

echo -e "${GREEN}✅ IAM role configured${NC}"
echo ""

echo -e "${YELLOW}☸️  Step 4: Updating Kubernetes deployment...${NC}"

# Update the deployment file with actual values
sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" k8s-ses-deployment.yaml | \
sed "s/noreply@yourdomain.com/${FROM_EMAIL}/g" | \
sed "s/ap-south-1/${REGION}/g" > /tmp/k8s-ses-deployment-updated.yaml

# Apply the service account
kubectl apply -f - <<EOF
apiVersion: v1
kind: ServiceAccount
metadata:
  name: notification-service-sa
  namespace: task-management-docker
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::${ACCOUNT_ID}:role/TaskManagementSESRole
EOF

# Update the notification service deployment
kubectl set env deployment/notification-service -n task-management-docker \
    EMAIL_PROVIDER=ses \
    AWS_REGION=${REGION} \
    SES_FROM_EMAIL=${FROM_EMAIL}

# Patch the deployment to use the service account
kubectl patch deployment notification-service -n task-management-docker -p '{"spec":{"template":{"spec":{"serviceAccountName":"notification-service-sa"}}}}'

# Restart the deployment
kubectl rollout restart deployment/notification-service -n task-management-docker

echo -e "${GREEN}✅ Kubernetes deployment updated${NC}"
echo ""

echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/notification-service -n task-management-docker --timeout=120s

echo ""
echo -e "${GREEN}🎉 SES setup completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo "  Provider: AWS SES"
echo "  Region: $REGION"
echo "  From Email: $FROM_EMAIL"
echo "  IAM Role: arn:aws:iam::${ACCOUNT_ID}:role/TaskManagementSESRole"
echo ""
echo -e "${YELLOW}🧪 To test email sending:${NC}"
echo "  1. Get the ingress URL:"
echo "     kubectl get ingress -n task-management-docker"
echo "  2. Test the email endpoint:"
echo "     curl -X POST http://YOUR_INGRESS_URL/api/notifications/test-email \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"to\":\"${FROM_EMAIL}\"}'"
echo ""
echo -e "${YELLOW}📝 Note: If you're in SES sandbox mode, you can only send to verified addresses.${NC}"
echo "To request production access, visit: https://console.aws.amazon.com/ses/"

# Cleanup
rm -f /tmp/ses-policy.json /tmp/trust-policy.json /tmp/k8s-ses-deployment-updated.yaml

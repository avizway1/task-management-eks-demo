# AWS SES Setup Guide for Notification Service

## Overview
The notification service now supports both SMTP (Gmail) and AWS SES for sending emails. AWS SES is recommended for production use in AWS environments.

## Benefits of Using AWS SES
- **Better deliverability**: Higher email delivery rates
- **Cost-effective**: Pay only for what you use
- **Scalable**: Handle high email volumes
- **Native AWS integration**: Works seamlessly with EKS using IAM roles
- **No credential management**: Uses IAM roles instead of passwords

## Quick Setup

### Step 1: Verify Email Address in SES
```bash
# Verify your sender email address
aws ses verify-email-identity --email-address noreply@yourdomain.com --region ap-south-1

# Check verification status
aws ses get-identity-verification-attributes --identities noreply@yourdomain.com --region ap-south-1
```

### Step 2: Request Production Access (Optional)
By default, SES is in sandbox mode (can only send to verified addresses).

For production use:
1. Go to AWS SES Console → Account Dashboard
2. Click "Request production access"
3. Fill out the form with your use case
4. Wait for approval (usually 24 hours)

### Step 3: Create IAM Policy for SES

Create a file `ses-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

Create the policy:
```bash
aws iam create-policy \
  --policy-name TaskManagementSESPolicy \
  --policy-document file://ses-policy.json
```

### Step 4: Create IAM Role for EKS Service Account
```bash
# Get your cluster OIDC provider
CLUSTER_NAME="your-cluster-name"
OIDC_PROVIDER=$(aws eks describe-cluster --name $CLUSTER_NAME --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///")

# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/$OIDC_PROVIDER"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$OIDC_PROVIDER:sub": "system:serviceaccount:task-management-docker:notification-service-sa"
        }
      }
    }
  ]
}
EOF
```

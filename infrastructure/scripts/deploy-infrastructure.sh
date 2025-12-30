#!/bin/bash

# CO1-CO5: Complete Infrastructure Deployment Script

echo "🚀 Deploying Cloud E-Commerce Infrastructure..."
echo "================================================"

# Variables
STACK_PREFIX="ecommerce"
REGION="us-east-1"
KEY_NAME="ecommerce-key"
DB_PASSWORD="YourSecurePassword123!"

# Step 1: Create Key Pair
echo "📝 Step 1: Creating EC2 Key Pair..."
aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --query 'KeyMaterial' \
    --output text > ${KEY_NAME}.pem
chmod 400 ${KEY_NAME}.pem
echo "✅ Key pair created: ${KEY_NAME}.pem"

# Step 2: Deploy VPC Stack
echo "📝 Step 2: Deploying VPC Infrastructure..."
aws cloudformation create-stack \
    --stack-name ${STACK_PREFIX}-vpc \
    --template-body file://cloudformation/vpc-template.yaml \
    --region $REGION

aws cloudformation wait stack-create-complete \
    --stack-name ${STACK_PREFIX}-vpc \
    --region $REGION
echo "✅ VPC Stack deployed"

# Step 3: Deploy RDS Stack
echo "📝 Step 3: Deploying RDS Database..."
aws cloudformation create-stack \
    --stack-name ${STACK_PREFIX}-rds \
    --template-body file://cloudformation/rds-template.yaml \
    --parameters ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
    --region $REGION

aws cloudformation wait stack-create-complete \
    --stack-name ${STACK_PREFIX}-rds \
    --region $REGION
echo "✅ RDS Stack deployed"

# Step 4: Create S3 Bucket
echo "📝 Step 4: Creating S3 Bucket..."
BUCKET_NAME="${STACK_PREFIX}-images-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Configure bucket for public read
aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy '{
        "Version": "2012-10-17",
        "Statement": [{
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
        }]
    }'
echo "✅ S3 Bucket created: $BUCKET_NAME"

# Step 5: Deploy ALB Stack
echo "📝 Step 5: Deploying Load Balancer..."
aws cloudformation create-stack \
    --stack-name ${STACK_PREFIX}-alb \
    --template-body file://cloudformation/alb-template.yaml \
    --region $REGION

aws cloudformation wait stack-create-complete \
    --stack-name ${STACK_PREFIX}-alb \
    --region $REGION
echo "✅ ALB Stack deployed"

# Step 6: Deploy Auto Scaling Stack
echo "📝 Step 6: Deploying Auto Scaling Group..."
aws cloudformation create-stack \
    --stack-name ${STACK_PREFIX}-ec2 \
    --template-body file://cloudformation/ec2-autoscaling-template.yaml \
    --parameters ParameterKey=KeyName,ParameterValue=$KEY_NAME \
    --capabilities CAPABILITY_IAM \
    --region $REGION

aws cloudformation wait stack-create-complete \
    --stack-name ${STACK_PREFIX}-ec2 \
    --region $REGION
echo "✅ Auto Scaling Stack deployed"

# Get outputs
echo ""
echo "================================================"
echo "🎉 Deployment Complete!"
echo "================================================"
echo ""

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-alb \
    --query 'Stacks[0].Outputs[?OutputKey==`ALBDNSName`].OutputValue' \
    --output text \
    --region $REGION)

DB_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-rds \
    --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
    --output text \
    --region $REGION)

echo "📊 Infrastructure Details:"
echo "------------------------"
echo "Load Balancer URL: http://$ALB_DNS"
echo "RDS Endpoint: $DB_ENDPOINT"
echo "S3 Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""
echo "📝 Next Steps:"
echo "1. Update backend .env files with these values"
echo "2. Connect to RDS and run database migrations"
echo "3. Deploy frontend to S3 + CloudFront"
echo "4. Configure DNS with your domain"
echo ""
echo "🔑 SSH to EC2 instances:"
echo "aws ec2 describe-instances --filters 'Name=tag:Name,Values=ECommerce-Microservice-Instance' --query 'Reservations[].Instances[].PublicIpAddress'"
echo ""
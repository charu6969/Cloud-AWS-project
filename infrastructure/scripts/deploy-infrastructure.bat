@echo off
REM ===== Windows Deployment Script for Cloud E-Commerce =====
REM Run this from Command Prompt or PowerShell

echo ========================================
echo  Cloud E-Commerce Infrastructure Setup
echo ========================================
echo.

REM Check if AWS CLI is installed
where aws >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI is not installed!
    echo Please install from: https://aws.amazon.com/cli/
    pause
    exit /b 1
)

echo [OK] AWS CLI found
echo.

REM Variables - CHANGE THESE
set STACK_PREFIX=ecommerce
set REGION=us-east-1
set KEY_NAME=ecommerce-key
set DB_PASSWORD=YourSecurePassword123!

echo Configuration:
echo   Stack Prefix: %STACK_PREFIX%
echo   Region: %REGION%
echo   Key Name: %KEY_NAME%
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

REM ===== Step 1: Create EC2 Key Pair =====
echo.
echo [Step 1/6] Creating EC2 Key Pair...
echo.

aws ec2 describe-key-pairs --key-name %KEY_NAME% --region %REGION% >nul 2>nul
if %errorlevel% equ 0 (
    echo Key pair %KEY_NAME% already exists. Skipping...
) else (
    aws ec2 create-key-pair --key-name %KEY_NAME% --region %REGION% --query "KeyMaterial" --output text > %KEY_NAME%.pem
    if %errorlevel% equ 0 (
        echo [OK] Key pair created: %KEY_NAME%.pem
        echo IMPORTANT: Keep this file safe! You need it to SSH into EC2 instances.
    ) else (
        echo [ERROR] Failed to create key pair
        pause
        exit /b 1
    )
)

REM ===== Step 2: Deploy VPC Stack =====
echo.
echo [Step 2/6] Deploying VPC Infrastructure...
echo This may take 2-3 minutes...
echo.

aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-vpc --region %REGION% >nul 2>nul
if %errorlevel% equ 0 (
    echo Stack %STACK_PREFIX%-vpc already exists. Skipping...
) else (
    aws cloudformation create-stack ^
        --stack-name %STACK_PREFIX%-vpc ^
        --template-body file://../cloudformation/vpc-template.yaml ^
        --region %REGION%
    
    if %errorlevel% equ 0 (
        echo Waiting for VPC stack to complete...
        aws cloudformation wait stack-create-complete ^
            --stack-name %STACK_PREFIX%-vpc ^
            --region %REGION%
        echo [OK] VPC Stack deployed successfully
    ) else (
        echo [ERROR] Failed to create VPC stack
        pause
        exit /b 1
    )
)

REM ===== Step 3: Create S3 Bucket =====
echo.
echo [Step 3/6] Creating S3 Bucket for product images...
echo.

REM Generate unique bucket name with timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BUCKET_NAME=%STACK_PREFIX%-images-%datetime:~0,14%

aws s3 ls s3://%BUCKET_NAME% 2>nul
if %errorlevel% equ 0 (
    echo Bucket already exists. Skipping...
) else (
    aws s3 mb s3://%BUCKET_NAME% --region %REGION%
    
    if %errorlevel% equ 0 (
        echo [OK] S3 Bucket created: %BUCKET_NAME%
        
        REM Create bucket policy for public read
        echo { > bucket-policy.json
        echo   "Version": "2012-10-17", >> bucket-policy.json
        echo   "Statement": [{ >> bucket-policy.json
        echo     "Sid": "PublicReadGetObject", >> bucket-policy.json
        echo     "Effect": "Allow", >> bucket-policy.json
        echo     "Principal": "*", >> bucket-policy.json
        echo     "Action": "s3:GetObject", >> bucket-policy.json
        echo     "Resource": "arn:aws:s3:::%BUCKET_NAME%/*" >> bucket-policy.json
        echo   }] >> bucket-policy.json
        echo } >> bucket-policy.json
        
        aws s3api put-bucket-policy --bucket %BUCKET_NAME% --policy file://bucket-policy.json
        del bucket-policy.json
        
        echo [OK] Bucket configured for public read access
    ) else (
        echo [ERROR] Failed to create S3 bucket
        pause
        exit /b 1
    )
)

REM ===== Step 4: Deploy RDS Stack =====
echo.
echo [Step 4/6] Deploying RDS PostgreSQL Database...
echo This may take 5-10 minutes...
echo.

aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-rds --region %REGION% >nul 2>nul
if %errorlevel% equ 0 (
    echo Stack %STACK_PREFIX%-rds already exists. Skipping...
) else (
    aws cloudformation create-stack ^
        --stack-name %STACK_PREFIX%-rds ^
        --template-body file://../cloudformation/rds-template.yaml ^
        --parameters ParameterKey=DBPassword,ParameterValue=%DB_PASSWORD% ^
        --region %REGION%
    
    if %errorlevel% equ 0 (
        echo Waiting for RDS stack to complete (this takes several minutes)...
        aws cloudformation wait stack-create-complete ^
            --stack-name %STACK_PREFIX%-rds ^
            --region %REGION%
        echo [OK] RDS Stack deployed successfully
    ) else (
        echo [ERROR] Failed to create RDS stack
        pause
        exit /b 1
    )
)

REM ===== Step 5: Deploy Application Load Balancer =====
echo.
echo [Step 5/6] Deploying Application Load Balancer...
echo.

aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-alb --region %REGION% >nul 2>nul
if %errorlevel% equ 0 (
    echo Stack %STACK_PREFIX%-alb already exists. Skipping...
) else (
    aws cloudformation create-stack ^
        --stack-name %STACK_PREFIX%-alb ^
        --template-body file://../cloudformation/alb-template.yaml ^
        --region %REGION%
    
    if %errorlevel% equ 0 (
        echo Waiting for ALB stack to complete...
        aws cloudformation wait stack-create-complete ^
            --stack-name %STACK_PREFIX%-alb ^
            --region %REGION%
        echo [OK] ALB Stack deployed successfully
    ) else (
        echo [ERROR] Failed to create ALB stack
        pause
        exit /b 1
    )
)

REM ===== Step 6: Deploy Auto Scaling Group =====
echo.
echo [Step 6/6] Deploying Auto Scaling Group with EC2 instances...
echo This may take 3-5 minutes...
echo.

aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-ec2 --region %REGION% >nul 2>nul
if %errorlevel% equ 0 (
    echo Stack %STACK_PREFIX%-ec2 already exists. Skipping...
) else (
    aws cloudformation create-stack ^
        --stack-name %STACK_PREFIX%-ec2 ^
        --template-body file://../cloudformation/ec2-autoscaling-template.yaml ^
        --parameters ParameterKey=KeyName,ParameterValue=%KEY_NAME% ^
        --capabilities CAPABILITY_IAM ^
        --region %REGION%
    
    if %errorlevel% equ 0 (
        echo Waiting for Auto Scaling stack to complete...
        aws cloudformation wait stack-create-complete ^
            --stack-name %STACK_PREFIX%-ec2 ^
            --region %REGION%
        echo [OK] Auto Scaling Stack deployed successfully
    ) else (
        echo [ERROR] Failed to create Auto Scaling stack
        pause
        exit /b 1
    )
)

REM ===== Get Deployment Information =====
echo.
echo ========================================
echo  DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ========================================
echo.

REM Get ALB DNS
for /f "delims=" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-alb --region %REGION% --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text 2^>nul') do set ALB_DNS=%%i

REM Get RDS Endpoint
for /f "delims=" %%i in ('aws cloudformation describe-stacks --stack-name %STACK_PREFIX%-rds --region %REGION% --query "Stacks[0].Outputs[?OutputKey=='DBEndpoint'].OutputValue" --output text 2^>nul') do set DB_ENDPOINT=%%i

echo Infrastructure Details:
echo -----------------------
echo Load Balancer URL: http://%ALB_DNS%
echo RDS Endpoint: %DB_ENDPOINT%
echo S3 Bucket: %BUCKET_NAME%
echo Region: %REGION%
echo Key Pair: %KEY_NAME%.pem
echo.
echo Next Steps:
echo -----------
echo 1. Update backend .env files with these values:
echo    - RDS_HOSTNAME=%DB_ENDPOINT%
echo    - S3_BUCKET_NAME=%BUCKET_NAME%
echo.
echo 2. Connect to RDS and run database migrations:
echo    psql -h %DB_ENDPOINT% -U admin -d ecommerce
echo.
echo 3. SSH to EC2 instances (get IP addresses):
echo    aws ec2 describe-instances --filters "Name=tag:Name,Values=ECommerce-Microservice-Instance" --query "Reservations[].Instances[].PublicIpAddress" --output table
echo.
echo 4. Deploy frontend to S3 and configure CloudFront
echo.
echo Press any key to save configuration...
pause >nul

REM Save configuration to file
echo # AWS Deployment Configuration > deployment-info.txt
echo # Generated on %date% %time% >> deployment-info.txt
echo. >> deployment-info.txt
echo ALB_DNS=%ALB_DNS% >> deployment-info.txt
echo DB_ENDPOINT=%DB_ENDPOINT% >> deployment-info.txt
echo S3_BUCKET=%BUCKET_NAME% >> deployment-info.txt
echo REGION=%REGION% >> deployment-info.txt
echo KEY_PAIR=%KEY_NAME%.pem >> deployment-info.txt
echo DB_PASSWORD=%DB_PASSWORD% >> deployment-info.txt

echo.
echo [OK] Configuration saved to: deployment-info.txt
echo.
echo Deployment complete! Press any key to exit...
pause >nul
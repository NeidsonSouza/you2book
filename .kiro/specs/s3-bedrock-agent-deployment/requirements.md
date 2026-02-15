# Requirements Document

## Introduction

This document specifies the requirements for automating the deployment of a Python-based Bedrock AgentCore runtime package to AWS S3 using GitHub Actions CI/CD. The system will build a Lambda-compatible deployment package, compare it with the existing S3 object using hash comparison, and only upload when changes are detected. The solution includes AWS infrastructure provisioning via CDK and a GitHub Actions workflow for continuous deployment.

## Glossary

- **Deployment_Package**: A zip file containing Python dependencies and application code compiled for AWS Lambda ARM64 architecture
- **S3_Bucket**: An AWS S3 bucket resource created via CDK for storing the deployment package
- **GitHub_Action**: An automated workflow that triggers on code changes to build and deploy the package
- **Hash_Comparison**: MD5 checksum comparison between local and remote deployment packages
- **CDK_Resource**: AWS Cloud Development Kit infrastructure-as-code resource definition
- **Build_Script**: Shell script that creates the deployment package using uv package manager
- **Git_Metadata**: Information about the git commit and branch associated with a deployment

## Requirements

### Requirement 1: S3 Bucket Infrastructure

**User Story:** As a DevOps engineer, I want an S3 bucket provisioned via CDK, so that I have a secure and managed storage location for deployment packages.

#### Acceptance Criteria

1. THE CDK_Resource SHALL create an S3_Bucket with the naming pattern `bedrock-agentcore-runtime-{account}-{region}`
2. THE S3_Bucket SHALL enable server-side encryption using AES256
3. THE S3_Bucket SHALL be configured with a removal policy of RETAIN
4. THE S3_Bucket SHALL be defined in the file `amplify/storage/bedrock-agent-bucket.ts`
5. THE CDK_Resource SHALL export the bucket name to Amplify backend configuration

### Requirement 2: Deployment Package Build Process

**User Story:** As a developer, I want the build process to create a Lambda-compatible deployment package, so that the code can run on AWS Lambda ARM64 architecture.

#### Acceptance Criteria

1. THE Build_Script SHALL use the `uv` package manager to create a virtual environment
2. THE Build_Script SHALL install Python dependencies for the `aarch64-manylinux2014` platform
3. THE Build_Script SHALL create a zip file containing dependencies and `main.py`
4. THE Build_Script SHALL calculate an MD5 hash of the Deployment_Package
5. THE Build_Script SHALL be located at `amplify/functions/bedrock-agent/build.sh`
6. THE Build_Script SHALL output the Deployment_Package to a predictable location

### Requirement 3: GitHub Actions Workflow Configuration

**User Story:** As a DevOps engineer, I want a GitHub Actions workflow that automates deployment, so that changes are automatically deployed when code is pushed.

#### Acceptance Criteria

1. THE GitHub_Action SHALL trigger on pushes to the `dev` branch
2. THE GitHub_Action SHALL trigger only when files in `amplify/functions/bedrock-agent/` or the workflow file change
3. THE GitHub_Action SHALL use Python 3.12 as the runtime environment
4. THE GitHub_Action SHALL install the `uv` package manager
5. THE GitHub_Action SHALL execute the Build_Script to create the Deployment_Package
6. THE GitHub_Action SHALL be defined in `.github/workflows/deploy-bedrock-agent.yml`

### Requirement 4: Hash-Based Upload Decision

**User Story:** As a DevOps engineer, I want uploads to occur only when the package has changed, so that I avoid unnecessary S3 operations and costs.

#### Acceptance Criteria

1. WHEN the Deployment_Package is built, THE GitHub_Action SHALL calculate its MD5 hash
2. WHEN an S3 object exists at the target location, THE GitHub_Action SHALL retrieve its ETag
3. THE GitHub_Action SHALL compare the local MD5 hash with the S3 ETag
4. IF the hashes differ, THEN THE GitHub_Action SHALL upload the Deployment_Package to S3
5. IF the hashes match, THEN THE GitHub_Action SHALL skip the upload and log a message

### Requirement 5: Git Metadata Storage

**User Story:** As a developer, I want git metadata stored with each deployment, so that I can trace which code version is deployed.

#### Acceptance Criteria

1. WHEN uploading to S3, THE GitHub_Action SHALL include the git commit SHA in object metadata
2. WHEN uploading to S3, THE GitHub_Action SHALL include the git branch name in object metadata
3. THE Git_Metadata SHALL be stored as S3 object metadata with keys `git-commit` and `git-branch`
4. THE Git_Metadata SHALL be retrievable via AWS CLI or SDK

### Requirement 6: AWS Credentials Management

**User Story:** As a security engineer, I want AWS credentials managed securely, so that deployment access is controlled and auditable.

#### Acceptance Criteria

1. THE GitHub_Action SHALL authenticate to AWS using GitHub Secrets
2. THE GitHub_Action SHALL require secrets named `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`
3. THE GitHub_Action SHALL require a secret named `BEDROCK_AGENT_BUCKET_NAME` containing the target bucket name
4. THE GitHub_Action SHALL NOT expose credentials in logs or outputs

### Requirement 7: Build Artifact Management

**User Story:** As a developer, I want build artifacts properly managed, so that the deployment process is reliable and reproducible.

#### Acceptance Criteria

1. THE Build_Script SHALL create a clean virtual environment for each build
2. THE Build_Script SHALL remove any existing Deployment_Package before building
3. THE Deployment_Package SHALL have a consistent naming convention
4. THE Build_Script SHALL validate that all required dependencies are included
5. THE Build_Script SHALL exit with a non-zero code if the build fails

### Requirement 8: Deployment Logging and Observability

**User Story:** As a DevOps engineer, I want comprehensive logging of deployment operations, so that I can troubleshoot issues and audit deployments.

#### Acceptance Criteria

1. THE GitHub_Action SHALL log the calculated MD5 hash of the Deployment_Package
2. THE GitHub_Action SHALL log whether an upload was performed or skipped
3. THE GitHub_Action SHALL log the S3 object key where the package is stored
4. THE GitHub_Action SHALL log the Git_Metadata being attached to the deployment
5. IF an error occurs, THEN THE GitHub_Action SHALL log detailed error information and fail the workflow

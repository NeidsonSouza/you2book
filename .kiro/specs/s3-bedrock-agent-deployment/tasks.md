# Implementation Plan: S3 Bedrock Agent Deployment

## Overview

This implementation plan covers the creation of AWS infrastructure (S3 bucket via CDK), a build script for creating Lambda-compatible deployment packages, and a GitHub Actions workflow for automated CI/CD deployment with hash-based optimization.

## Tasks

- [ ] 1. Create CDK S3 bucket resource
  - Create `amplify/storage/bedrock-agent-bucket.ts` with S3 bucket definition
  - Configure bucket with AES256 encryption and RETAIN removal policy
  - Set bucket naming pattern: `bedrock-agentcore-runtime-${account}-${region}`
  - Export bucket name to Amplify backend configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write unit tests for CDK bucket configuration
  - Test bucket name generation
  - Test encryption configuration
  - Test removal policy
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Create build script for deployment package
  - [ ] 2.1 Create `amplify/functions/bedrock-agent/build.sh`
    - Implement clean build process (remove previous builds)
    - Create virtual environment using `uv`
    - Install dependencies for `aarch64-manylinux2014` platform
    - Copy `main.py` to package directory
    - Create zip archive
    - Calculate MD5 hash and save to `.md5` file
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 7.1, 7.2_

  - [ ]* 2.2 Write property test for MD5 hash calculation
    - **Property 1: MD5 Hash Calculation Accuracy**
    - **Validates: Requirements 2.4**
    - Generate random deployment packages
    - Verify script's MD5 matches independent calculation
    - _Requirements: 2.4_

  - [ ]* 2.3 Write property test for build idempotence
    - **Property 4: Build Idempotence**
    - **Validates: Requirements 7.1, 7.3**
    - Run build script multiple times with same inputs
    - Verify all output packages have identical MD5 hashes
    - _Requirements: 7.1, 7.3_

  - [ ]* 2.4 Write property test for dependency completeness
    - **Property 5: Dependency Completeness**
    - **Validates: Requirements 7.4**
    - Generate various requirements.txt files
    - Verify all packages and transitive dependencies are included
    - _Requirements: 7.4_

  - [ ]* 2.5 Write property test for build failure propagation
    - **Property 6: Build Failure Propagation**
    - **Validates: Requirements 7.5**
    - Introduce various build errors (missing deps, invalid Python version)
    - Verify script exits with non-zero code
    - _Requirements: 7.5_

- [ ] 3. Create GitHub Actions workflow
  - [ ] 3.1 Create `.github/workflows/deploy-bedrock-agent.yml`
    - Configure trigger on `dev` branch pushes
    - Add path filters for `amplify/functions/bedrock-agent/**` and workflow file
    - Set up Python 3.12 environment
    - Install `uv` package manager
    - Execute build script
    - Calculate local MD5 hash
    - Configure AWS credentials from GitHub Secrets
    - Retrieve S3 object ETag (if exists)
    - Compare hashes and conditionally upload
    - Attach git metadata (commit SHA, branch name) to S3 object
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 6.3_

  - [ ]* 3.2 Write property test for conditional upload logic
    - **Property 2: Conditional Upload Logic**
    - **Validates: Requirements 4.3, 4.4, 4.5**
    - Test with matching hashes (should skip upload)
    - Test with differing hashes (should upload)
    - Test with no existing S3 object (should upload)
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 3.3 Write property test for git metadata round-trip
    - **Property 3: Git Metadata Round-Trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - Generate random commit SHAs and branch names
    - Upload to S3 with metadata
    - Retrieve and verify metadata matches
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.4 Write property test for credential masking
    - **Property 7: Credential Masking**
    - **Validates: Requirements 6.4**
    - Run workflow with test credentials
    - Verify credentials don't appear in logs
    - _Requirements: 6.4_

  - [ ]* 3.5 Write property test for error logging
    - **Property 8: Error Logging Completeness**
    - **Validates: Requirements 8.5**
    - Introduce various errors (auth failure, S3 access denied, build failure)
    - Verify detailed error logs and non-zero exit codes
    - _Requirements: 8.5_

- [ ] 4. Create project structure and placeholder files
  - Create `amplify/functions/bedrock-agent/src/main.py` with placeholder code
  - Create `amplify/functions/bedrock-agent/requirements.txt` with sample dependencies
  - Create `amplify/functions/bedrock-agent/pyproject.toml` for uv configuration
  - _Requirements: 2.5_

- [ ] 5. Checkpoint - Verify build script works locally
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Configure GitHub repository secrets
  - Document required secrets in README or deployment guide:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
    - `AWS_REGION`
    - `BEDROCK_AGENT_BUCKET_NAME`
  - _Requirements: 6.2, 6.3_

- [ ] 7. Deploy CDK infrastructure
  - Deploy Amplify backend with S3 bucket resource
  - Verify bucket is created with correct configuration
  - Note bucket name for GitHub Secrets configuration
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 8. Test end-to-end workflow
  - [ ] 8.1 Test first deployment (no existing S3 object)
    - Push code to `dev` branch
    - Verify workflow triggers
    - Verify package is built and uploaded
    - Verify git metadata is attached
    - _Requirements: 4.4, 5.1, 5.2_

  - [ ] 8.2 Test unchanged package deployment
    - Push unrelated code change to `dev` branch
    - Verify workflow skips upload due to matching hash
    - _Requirements: 4.5_

  - [ ] 8.3 Test changed package deployment
    - Modify `main.py` or `requirements.txt`
    - Push to `dev` branch
    - Verify workflow detects change and uploads new package
    - _Requirements: 4.4_

- [ ] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- The build script should be tested locally before integrating with GitHub Actions
- AWS credentials must be configured in GitHub Secrets before the workflow can run
- The CDK infrastructure must be deployed before the workflow can upload to S3

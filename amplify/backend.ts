import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { fetchChannelVideos } from './functions/fetch-channel-videos/resource';
import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({
  auth,
  data,
  fetchChannelVideos,
});

// Extract Cognito resources from Amplify backend
const userPool = backend.auth.resources.userPool;
const userPoolClient = backend.auth.resources.userPoolClient;

// Run build script at synth time
const agentcoreBuildScript = path.resolve(__dirname, '..', 'agentcore', 'build.sh');
execSync(`bash ${agentcoreBuildScript}`, { stdio: 'inherit' });

const customResourceStack = backend.createStack('AgentcoreBucketStack');
const bucket = new s3.Bucket(customResourceStack, 'AgentcoreBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  bucketKeyEnabled: true,
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
});

// Deploy agentcore package to S3
const agentcoreDistPath = path.resolve(__dirname, '..', 'agentcore', 'dist');
new s3deploy.BucketDeployment(customResourceStack, 'AgentcoreDeployment', {
  sources: [s3deploy.Source.asset(agentcoreDistPath)],
  destinationBucket: bucket,
  destinationKeyPrefix: 'main',
});

// Create AgentCore Runtime construct
const runtime = new agentcore.Runtime(customResourceStack, 'AgentcoreRuntime', {
  runtimeName: 'you2book-http-server',
  agentRuntimeArtifact: agentcore.AgentRuntimeArtifact.fromS3(
    { bucketName: bucket.bucketName, objectKey: 'main/deployment_package.zip' },
    agentcore.AgentCoreRuntime.PYTHON_3_12,
    ['main.py']
  ),
  authorizerConfiguration: agentcore.RuntimeAuthorizerConfiguration.usingCognito(
    userPool,
    [userPoolClient]
  ),
  protocolConfiguration: agentcore.ProtocolType.HTTP,
  networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
  description: 'You2Book HTTP server runtime',
});

// Add minimal IAM permissions to the execution role
runtime.addToRolePolicy(new iam.PolicyStatement({
  actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
  resources: [
    'arn:aws:bedrock:*::foundation-model/*',
    'arn:aws:bedrock:*:*:inference-profile/*',
  ],
}));

runtime.addToRolePolicy(new iam.PolicyStatement({
  actions: [
    'logs:CreateLogGroup',
    'logs:CreateLogStream',
    'logs:PutLogEvents',
    'logs:DescribeLogStreams',
    'logs:DescribeLogGroups',
  ],
  resources: ['arn:aws:logs:*:*:log-group:/aws/bedrock-agentcore/runtimes/*'],
}));

// Export the Runtime ARN as a CfnOutput
new cdk.CfnOutput(customResourceStack, 'AgentcoreRuntimeArn', {
  value: runtime.agentRuntimeArn,
  description: 'ARN of the AgentCore Runtime',
});

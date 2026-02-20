import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import { Function } from 'aws-cdk-lib/aws-lambda';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { fetchChannelVideos } from './functions/fetch-channel-videos/resource';
import { agentInvoker } from './functions/agent-invoker/resource';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({
  auth,
  data,
  fetchChannelVideos,
  agentInvoker,
  storage
});



// Only run build if agentcore source files have changed
const agentcoreSrcDir = path.resolve(__dirname, '..', 'agentcore', 'src');
const agentcoreDistDir = path.resolve(__dirname, '..', 'agentcore', 'dist');
const buildHashPath = path.join(agentcoreDistDir, '.build_hash');
const deploymentZipPath = path.join(agentcoreDistDir, 'deployment_package.zip');

const sourceFiles = ['main.py', 'requirements.txt'];
const hashContent = sourceFiles
  .map((f) => fs.readFileSync(path.join(agentcoreSrcDir, f)))
  .reduce((hash, buf) => hash.update(buf), createHash('sha256'))
  .digest('hex');

const previousHash = fs.existsSync(buildHashPath)
  ? fs.readFileSync(buildHashPath, 'utf-8').trim()
  : '';

if (hashContent !== previousHash || !fs.existsSync(deploymentZipPath)) {
  const agentcoreBuildScript = path.resolve(__dirname, '..', 'agentcore', 'build.sh');
  execSync(`bash ${agentcoreBuildScript}`, { stdio: 'inherit' });
  fs.writeFileSync(buildHashPath, hashContent);
} else {
  console.log('agentcore: source unchanged, skipping build');
}

const customResourceStack = backend.createStack('AgentcoreBucketStack');
const bucket = new s3.Bucket(customResourceStack, 'AgentcoreBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  bucketKeyEnabled: true,
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
  autoDeleteObjects: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Deploy agentcore package to S3 with content-hash prefix so CFN detects changes
const zipHash = hashContent.substring(0, 8);
const agentcoreDistPath = path.resolve(__dirname, '..', 'agentcore', 'dist');
const deployment = new s3deploy.BucketDeployment(customResourceStack, 'AgentcoreDeployment', {
  sources: [s3deploy.Source.asset(agentcoreDistPath)],
  destinationBucket: bucket,
  destinationKeyPrefix: `main/${zipHash}`,
});

// Create AgentCore Runtime construct
const runtime = new agentcore.Runtime(customResourceStack, 'AgentcoreRuntime', {
  runtimeName: 'you2book_http_server',
  agentRuntimeArtifact: agentcore.AgentRuntimeArtifact.fromS3(
    { bucketName: bucket.bucketName, objectKey: `main/${zipHash}/deployment_package.zip` },
    agentcore.AgentCoreRuntime.PYTHON_3_12,
    ['main.py']
  ),
  authorizerConfiguration: agentcore.RuntimeAuthorizerConfiguration.usingIAM(),
  protocolConfiguration: agentcore.ProtocolType.HTTP,
  networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
  description: 'You2Book HTTP server runtime',
});

// Ensure the S3 deployment completes before the Runtime is created
// Add dependency at both construct tree and CFN level for reliability
runtime.node.addDependency(deployment);

// Also wire up CFN-level DependsOn explicitly
const allRuntimeChildren = runtime.node.findAll();
const allDeploymentChildren = deployment.node.findAll();

const runtimeCfnResource = allRuntimeChildren.find(
  (c): c is cdk.CfnResource => c instanceof cdk.CfnResource && c.cfnResourceType === 'AWS::BedrockAgentCore::Runtime'
);
const deploymentCfnResource = allDeploymentChildren.find(
  (c): c is cdk.CfnResource => c instanceof cdk.CfnResource && c.cfnResourceType === 'Custom::CDKBucketDeployment'
);

if (runtimeCfnResource && deploymentCfnResource) {
  runtimeCfnResource.addDependency(deploymentCfnResource);
} else {
  console.warn('agentcore: Could not wire CFN dependency.',
    'Runtime CFN found:', !!runtimeCfnResource,
    'Deployment CFN found:', !!deploymentCfnResource
  );
  // Log all construct types for debugging
  console.warn('Runtime children:', allRuntimeChildren.map(c => c.node.id).join(', '));
  console.warn('Deployment children:', allDeploymentChildren.map(c => c.node.id).join(', '));
}

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

// Grant the agent-invoker Lambda permission to invoke the AgentCore Runtime
const agentInvokerLambda = backend.agentInvoker.resources.lambda as Function;
runtime.grantInvoke(agentInvokerLambda);

// Pass the Runtime ARN to the agent-invoker Lambda as an environment variable
agentInvokerLambda.addEnvironment('AGENT_RUNTIME_ARN', runtime.agentRuntimeArn);

// Export the Runtime ARN as a CfnOutput
new cdk.CfnOutput(customResourceStack, 'AgentcoreRuntimeArn', {
  value: runtime.agentRuntimeArn,
  description: 'ARN of the AgentCore Runtime',
});

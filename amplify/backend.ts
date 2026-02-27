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
import { saveTranscript } from './functions/save-transcript/resource';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { discoverAgents, computeContentHash, shouldBuild } from '../src/lib/agentDiscovery';
import { generateRuntimeName, buildRegistryMap } from '../src/lib/agentRegistry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({
  auth,
  data,
  fetchChannelVideos,
  agentInvoker,
  saveTranscript,
  storage
});



// Discover and build all agents under agentcore/
const agentcoreRoot = path.resolve(__dirname, '..', 'agentcore');
const agents = discoverAgents(agentcoreRoot);

for (const agent of agents) {
  const sourceFiles = fs.readdirSync(agent.srcDir)
    .filter((f) => f.endsWith('.py') || f.endsWith('.txt'))
    .sort();
  const sourceBuffers = sourceFiles.map((f) =>
    fs.readFileSync(path.join(agent.srcDir, f))
  );
  const currentHash = computeContentHash(sourceBuffers);

  const buildHashPath = path.join(agent.distDir, '.build_hash');
  const deploymentZipPath = path.join(agent.distDir, 'deployment_package.zip');

  const previousHash = fs.existsSync(buildHashPath)
    ? fs.readFileSync(buildHashPath, 'utf-8').trim()
    : '';

  if (shouldBuild(currentHash, previousHash, fs.existsSync(deploymentZipPath))) {
    execSync(`bash ${agent.buildScript}`, { stdio: 'inherit' });
    if (!fs.existsSync(agent.distDir)) {
      fs.mkdirSync(agent.distDir, { recursive: true });
    }
    fs.writeFileSync(buildHashPath, currentHash);
  } else {
    console.log(`agentcore [${agent.name}]: source unchanged, skipping build`);
  }
}

const customResourceStack = backend.createStack('AgentcoreBucketStack');
const bucket = new s3.Bucket(customResourceStack, 'AgentcoreBucket', {
  encryption: s3.BucketEncryption.S3_MANAGED,
  bucketKeyEnabled: true,
  objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
  autoDeleteObjects: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const agentInvokerLambda = backend.agentInvoker.resources.lambda as Function;
const runtimeEntries: Array<{ name: string; arn: string }> = [];

for (const agent of agents) {
  const sourceFiles = fs.readdirSync(agent.srcDir)
    .filter((f) => f.endsWith('.py') || f.endsWith('.txt'))
    .sort();
  const sourceBuffers = sourceFiles.map((f) =>
    fs.readFileSync(path.join(agent.srcDir, f))
  );
  const zipHash = computeContentHash(sourceBuffers).substring(0, 8);

  // Deploy agent package to S3 with content-hash prefix so CFN detects changes
  const deployment = new s3deploy.BucketDeployment(customResourceStack, `AgentcoreDeploy_${agent.name}`, {
    sources: [s3deploy.Source.asset(agent.distDir)],
    destinationBucket: bucket,
    destinationKeyPrefix: `${agent.name}/${zipHash}`,
  });

  // Build environment variables per agent
  const environmentVariables: { [key: string]: string } = {};
  if (agent.name === 'gemini') {
    environmentVariables['OUTPUT_BUCKET_NAME'] = bucket.bucketName;
  }

  // Create AgentCore Runtime construct for this agent
  const runtime = new agentcore.Runtime(customResourceStack, `AgentcoreRuntime_${agent.name}`, {
    runtimeName: generateRuntimeName(agent.name),
    agentRuntimeArtifact: agentcore.AgentRuntimeArtifact.fromS3(
      { bucketName: bucket.bucketName, objectKey: `${agent.name}/${zipHash}/deployment_package.zip` },
      agentcore.AgentCoreRuntime.PYTHON_3_12,
      ['main.py']
    ),
    authorizerConfiguration: agentcore.RuntimeAuthorizerConfiguration.usingIAM(),
    protocolConfiguration: agentcore.ProtocolType.HTTP,
    networkConfiguration: agentcore.RuntimeNetworkConfiguration.usingPublicNetwork(),
    description: `You2Book ${agent.name} runtime`,
    ...(Object.keys(environmentVariables).length > 0 && { environmentVariables }),
  });

  // Ensure the S3 deployment completes before the Runtime is created
  runtime.node.addDependency(deployment);

  // Wire up CFN-level DependsOn explicitly
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
    console.warn(`agentcore [${agent.name}]: Could not wire CFN dependency.`,
      'Runtime CFN found:', !!runtimeCfnResource,
      'Deployment CFN found:', !!deploymentCfnResource
    );
    console.warn('Runtime children:', allRuntimeChildren.map(c => c.node.id).join(', '));
    console.warn('Deployment children:', allDeploymentChildren.map(c => c.node.id).join(', '));
  }

  // Grant IAM permissions for Bedrock model invocation
  runtime.addToRolePolicy(new iam.PolicyStatement({
    actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      'arn:aws:bedrock:*:*:inference-profile/*',
    ],
  }));

  // Grant IAM permissions for CloudWatch logging
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

  // Grant the agent-invoker Lambda permission to invoke this Runtime
  runtime.grantInvoke(agentInvokerLambda);

  // Gemini-specific: grant S3 write access for book output
  if (agent.name === 'gemini') {
    runtime.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${bucket.bucketArn}/books/*`],
    }));
  }

  runtimeEntries.push({ name: agent.name, arn: runtime.agentRuntimeArn });
}

// Build the registry map and set it as an environment variable on the invoker Lambda
const runtimeMap = buildRegistryMap(runtimeEntries);
agentInvokerLambda.addEnvironment('AGENT_RUNTIME_MAP', JSON.stringify(runtimeMap));

// Grant the fetch-channel-videos Lambda write access to the storage bucket for transcripts
const storageBucket = backend.storage.resources.bucket;
const fetchLambda = backend.fetchChannelVideos.resources.lambda as Function;
storageBucket.grantWrite(fetchLambda, 'transcripts/*');

// Pass the bucket name as an environment variable to the Lambda
fetchLambda.addEnvironment('TRANSCRIPT_BUCKET_NAME', storageBucket.bucketName);

// Grant the save-transcript Lambda write access to the storage bucket for transcripts
const saveTranscriptLambda = backend.saveTranscript.resources.lambda as Function;
storageBucket.grantWrite(saveTranscriptLambda, 'transcripts/*');

// Grant the fetch-channel-videos Lambda permission to invoke the save-transcript Lambda
saveTranscriptLambda.grantInvoke(fetchLambda);

// Pass the save-transcript Lambda function name to the fetch-channel-videos Lambda
fetchLambda.addEnvironment('SAVE_TRANSCRIPT_FUNCTION_NAME', saveTranscriptLambda.functionName);

// Export the Runtime map as a CfnOutput
new cdk.CfnOutput(customResourceStack, 'AgentcoreRuntimeMap', {
  value: JSON.stringify(runtimeMap),
  description: 'JSON map of agent names to AgentCore Runtime ARNs',
});

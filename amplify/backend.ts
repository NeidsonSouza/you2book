import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
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

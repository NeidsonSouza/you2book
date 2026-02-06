import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { youtubeVideoFetcher } from './functions/youtube-video-fetcher/resource';

const backend = defineBackend({
  auth,
  data,
  youtubeVideoFetcher,
});

// Grant the Lambda function access to the Video table
const videoTable = backend.data.resources.tables['Video'];
backend.youtubeVideoFetcher.addEnvironment(
  'VIDEO_TABLE_NAME',
  videoTable.tableName
);
videoTable.grantReadWriteData(backend.youtubeVideoFetcher.resources.lambda);


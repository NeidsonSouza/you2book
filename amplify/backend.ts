import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { youtubeVideoFetcher } from './functions/youtube-video-fetcher/resource';

defineBackend({
  auth,
  data,
  youtubeVideoFetcher,
});

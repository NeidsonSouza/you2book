import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { fetchChannelVideos } from './functions/fetch-channel-videos/resource';

const backend = defineBackend({
  auth,
  data,
  fetchChannelVideos,
});

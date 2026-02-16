import { defineFunction, secret } from '@aws-amplify/backend';

export const fetchChannelVideos = defineFunction({
  name: 'fetch-channel-videos',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    YOUTUBE_API_KEY: secret('YOUTUBE_API_KEY'),
  },
});

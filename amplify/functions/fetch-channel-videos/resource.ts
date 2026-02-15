import { defineFunction } from '@aws-amplify/backend';

export const fetchChannelVideos = defineFunction({
  name: 'fetch-channel-videos',
  entry: './handler.ts'
});

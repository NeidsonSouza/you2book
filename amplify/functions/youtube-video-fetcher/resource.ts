import { defineFunction } from '@aws-amplify/backend';

export const youtubeVideoFetcher = defineFunction({
  name: 'youtube-video-fetcher',
  entry: './handler.ts',
  environment: {
    YOUTUBE_API_KEY_SECRET: 'youtube-api-key',
  },
  runtime: 20,
  timeoutSeconds: 30,
});
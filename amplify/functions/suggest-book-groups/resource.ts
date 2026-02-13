import { defineFunction } from '@aws-amplify/backend';

export const suggestBookGroups = defineFunction({
  name: 'suggest-book-groups',
  entry: './handler.py',
  runtime: 'python3.12',
  timeoutSeconds: 300, // 5 minutes for AI processing
  memoryMB: 512,
});

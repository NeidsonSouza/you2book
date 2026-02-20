import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'videoTranscripts',
  access: (allow) => ({
    'transcripts/{entity_id}/*': [
      allow.entity('identity').to(['read'])
    ],
  })
});

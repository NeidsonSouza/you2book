import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'videoTranscripts',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete'])
    ],
    'picture-submissions/*': [
      allow.authenticated.to(['read', 'write']),
    ],
  })
});

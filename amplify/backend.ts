import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/say-hello/resource';
import { suggestBookGroups } from './functions/suggest-book-groups/resource';

const backend = defineBackend({
  auth,
  data,
  sayHello,
  suggestBookGroups,
});

// Grant suggestBookGroups function access to data resources
backend.suggestBookGroups.addEnvironment('VIDEO_TABLE_NAME', backend.data.resources.tables['Video'].tableName);
backend.data.resources.tables['Video'].grantReadData(backend.suggestBookGroups.resources.lambda);
backend.data.resources.tables['BookGroup'].grantReadWriteData(backend.suggestBookGroups.resources.lambda);

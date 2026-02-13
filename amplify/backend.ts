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

const { cfnResources } = backend.sayHello.resources;

for (const [resourceType, resources] of Object.entries(cfnResources)) {
  console.log(`Resource Type: ${resourceType}`);
  const resourceNames = Object.keys(resources);
  if (resourceNames.length > 0) {
    resourceNames.forEach(name => console.log(`  - ${name}`));
  } else {
    console.log('  (No resources found for this type)');
  }
}

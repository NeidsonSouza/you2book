import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/say-hello/resource';
const backend = defineBackend({
  auth,
  data,
  sayHello,
});

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

# Tech Stack

## Frontend
- React 19 with TypeScript (strict mode)
- Vite 7 for bundling and dev server
- React Router DOM v7 for client-side routing
- AWS Amplify UI React for authentication components
- AWS Amplify JS SDK v6 for data client (GraphQL via `generateClient<Schema>()`)

## Backend
- AWS Amplify Gen 2 (defines backend resources in TypeScript via CDK)
- Amazon Cognito (user pool auth, email login)
- AWS AppSync (GraphQL API, auto-generated from Amplify data schema)
- Amazon DynamoDB (data storage, managed by Amplify)
- AWS Lambda functions:
  - `fetch-channel-videos` — TypeScript, fetches YouTube channel data and saves to DB
  - `agent-invoker` — Python 3.12, invokes the Bedrock AgentCore runtime
- AWS Bedrock AgentCore Runtime — runs a Strands Agent (Python/FastAPI) for AI tasks

## AI / Agent
- Strands Agents SDK (Python) with Amazon Nova Micro model
- FastAPI HTTP server deployed as AgentCore Runtime
- Packaged as a zip and deployed to S3, then referenced by AgentCore

## Testing
- Vitest (test runner, `vitest --run` for single execution)
- fast-check for property-based testing
- `vitest.config.ts` uses `globals: true` and `environment: 'node'`

## Linting
- ESLint 9 with flat config (`eslint.config.js`)
- TypeScript ESLint plugin with `explicit-function-return-type` enforced
- Unused vars allowed with `_` prefix pattern

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server
npx ampx sandbox         # Start Amplify sandbox (local cloud backend)

# Build
npm run build            # TypeScript compile + Vite build

# Test
npm run test             # Run tests once (vitest --run)
npm run test:watch       # Run tests in watch mode

# Lint
npm run lint             # ESLint with zero warnings tolerance

# Amplify
npx ampx pipeline-deploy # Deploy backend via Amplify pipeline
```

## Node Requirements
- Node >= 20.20.0
- npm >= 10.8.0

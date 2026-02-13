# Technology Stack

## Frontend

- React 19.2.4 with TypeScript
- Vite 7.3.1 (build tool and dev server)
- React Router DOM 7.13.0 (routing)
- AWS Amplify UI React 6.13.2 (authentication UI components)

## Backend

- AWS Amplify Gen2 (backend framework)
- AWS Lambda (serverless functions)
- DynamoDB (database via Amplify Data)
- AWS Cognito (authentication via Amplify Auth)

## External APIs

- YouTube Data API v3 (via googleapis package)
- AWS Systems Manager Parameter Store (for API key storage)

## Build System

- TypeScript 5.9.3 with strict mode enabled
- ESLint 9.39.2 with TypeScript plugin
- Node.js >= 20.20.0, npm >= 10.8.0

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server (frontend only)

# Building
npm run build            # TypeScript compile + Vite production build
npx ampx sandbox         # Start local Amplify backend sandbox

# Code Quality
npm run lint             # Run ESLint on TypeScript files

# Preview
npm run preview          # Preview production build locally

# Deployment
npx ampx pipeline-deploy # Deploy to AWS via Amplify pipeline
```

## TypeScript Configuration

- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled with unused locals/parameters checks
- JSX: react-jsx (React 17+ transform)

## Key Dependencies

- aws-amplify 6.16.0 (AWS SDK for frontend)
- @aws-amplify/backend 1.20.0 (backend infrastructure)
- googleapis 144.0.0 (YouTube API client)
- @aws-sdk/client-ssm 3.x (Parameter Store access)

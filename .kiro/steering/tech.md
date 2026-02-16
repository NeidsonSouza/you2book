# Technology Stack

## Frontend
- React 19.2.4 with TypeScript
- Vite for build tooling and dev server
- React Router DOM for routing
- AWS Amplify UI React components
- CSS for styling

## Backend
- AWS Amplify Gen2 (fullstack TypeScript framework)
- AWS Lambda functions (Node.js runtime)
- AWS AppSync (GraphQL API with owner-based authorization)
- Amazon Cognito for authentication
- DynamoDB for data storage

## Key Libraries
- aws-amplify SDK for client-side AWS integration
- @aws-amplify/backend for infrastructure as code
- googleapis for YouTube Data API v3 integration
- axios for HTTP requests
- fast-check for property-based testing

## Testing
- Vitest as test runner
- Property-based testing with fast-check
- Unit tests co-located with source files using `.test.ts` suffix

## Build System & Commands

### Frontend Development
```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + Vite production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint with strict warnings
npm run test         # Run tests once (CI mode)
npm run test:watch   # Run tests in watch mode
```

### Backend Development
```bash
npx ampx sandbox     # Start local Amplify sandbox environment
npx ampx generate    # Generate GraphQL client types
npx ampx deploy      # Deploy to AWS
```

## Environment Requirements
- Node.js >= 20.20.0
- npm >= 10.8.0

## Configuration Files
- `amplify/backend.ts` - Amplify backend resource definitions
- `amplify/data/resource.ts` - GraphQL schema and data models
- `vite.config.ts` - Vite bundler configuration
- `vitest.config.ts` - Test runner configuration
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.js` - Linting rules

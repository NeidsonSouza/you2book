# Tech Stack

## Frontend
- React 19 with TypeScript
- Vite (build tool and dev server)
- React Router DOM for routing
- AWS Amplify UI React components

## Backend
- AWS Amplify Gen 2 (serverless backend)
- AWS Lambda functions (Node.js TypeScript and Python)
- DynamoDB (via Amplify Data)
- Cognito (via Amplify Auth)
- YouTube Data API integration

## Testing
- Vitest for unit tests
- fast-check for property-based testing

## Code Quality
- ESLint with TypeScript rules
- Strict TypeScript configuration

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server

# Building
npm run build            # TypeScript compile + Vite build

# Testing
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode

# Code Quality
npm run lint             # Run ESLint

# Preview
npm run preview          # Preview production build
```

## Node Requirements
- Node >= 20.20.0
- npm >= 10.8.0

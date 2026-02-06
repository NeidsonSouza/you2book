# Tech Stack

## Frontend
- **Framework**: React 19.2.4 with TypeScript
- **Build Tool**: Vite 7.3.1
- **Routing**: React Router DOM 7.13.0
- **UI Library**: AWS Amplify UI React 6.13.2
- **Styling**: CSS (App.css, index.css)

## Backend
- **Platform**: AWS Amplify Gen2 (1.20.0)
- **Authentication**: Amazon Cognito (email-based)
- **Database**: DynamoDB (via Amplify Data)
- **Functions**: AWS Lambda with Node.js
- **External APIs**: YouTube Data API v3 (googleapis)

## Development Tools
- **Linting**: ESLint 9.39.2 with TypeScript plugin
- **Type Checking**: TypeScript 5.9.3 (strict mode enabled)
- **Node Version**: >= 20.20.0
- **Package Manager**: npm >= 10.8.0

## Common Commands

```bash
# Development
npm run dev              # Start Vite dev server
npx ampx sandbox         # Start Amplify sandbox environment

# Building
npm run build            # TypeScript compile + Vite build
tsc                      # Type check only

# Code Quality
npm run lint             # Run ESLint

# Preview
npm run preview          # Preview production build
```

## TypeScript Configuration
- Target: ES2020
- Module: ESNext with bundler resolution
- Strict mode enabled with unused locals/parameters checks
- JSX: react-jsx

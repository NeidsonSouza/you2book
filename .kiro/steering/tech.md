# Technology Stack

## Frontend
- **React 19.2.4** with TypeScript
- **Vite** as build tool and dev server
- **AWS Amplify UI React** for authentication components
- **CSS** for styling (no framework)

## Backend
- **AWS Amplify Gen2** backend
- **AWS Cognito** for authentication
- **AWS AppSync** for GraphQL API
- **DynamoDB** for data storage

## Development Tools
- **TypeScript 5.9.3** for type safety
- **ESLint** for code linting
- **Node.js >= 20.20.0** and **npm >= 10.8.0** required

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Amplify Backend
```bash
npx ampx sandbox     # Start local backend sandbox
npx ampx deploy      # Deploy to AWS
npx ampx generate    # Generate client code
```

## Key Patterns
- Use `generateClient<Schema>()` for type-safe API calls
- All models use owner-based authorization by default
- Real-time subscriptions with `observeQuery()`
- TypeScript strict mode enabled
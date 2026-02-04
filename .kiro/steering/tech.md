# Technology Stack

## Frontend
- **React 19.2.4** - UI framework with hooks and functional components
- **TypeScript 5.9.3** - Type-safe JavaScript with strict mode enabled
- **Vite 7.3.1** - Fast build tool and dev server
- **AWS Amplify UI React** - Pre-built authentication components

## Backend
- **AWS Amplify Gen2** - Full-stack development platform
- **GraphQL** - API layer with real-time subscriptions
- **DynamoDB** - NoSQL database for data storage
- **AWS Cognito** - User authentication and management

## Build System & Tools
- **Vite** - Module bundler and development server
- **ESLint** - Code linting with TypeScript rules
- **esbuild** - Fast JavaScript bundler

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Amplify Backend
```bash
npx ampx sandbox     # Start local backend sandbox
npx ampx deploy      # Deploy to AWS
npx ampx generate    # Generate client code
```

## Node.js Requirements
- **Node.js**: >= 20.20.0
- **npm**: >= 10.8.0

## Code Style
- **ES Modules** - Use import/export syntax
- **Strict TypeScript** - All strict compiler options enabled
- **React JSX Transform** - Modern JSX without React imports
- **Functional Components** - Prefer hooks over class components
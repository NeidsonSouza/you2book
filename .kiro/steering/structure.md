# Project Structure

## Root Directory
```
├── amplify/           # AWS Amplify backend configuration
├── src/              # Frontend React application
├── public/           # Static assets
├── .kiro/            # Kiro AI assistant configuration
└── package.json      # Frontend dependencies and scripts
```

## Frontend Structure (`src/`)
```
src/
├── App.tsx           # Main application component
├── main.tsx          # Application entry point with Amplify config
├── App.css           # Application styles
├── index.css         # Global styles
├── vite-env.d.ts     # Vite type definitions
└── assets/           # Static assets (images, icons)
```

## Backend Structure (`amplify/`)
```
amplify/
├── backend.ts        # Main backend configuration
├── auth/
│   └── resource.ts   # Authentication configuration
├── data/
│   └── resource.ts   # Data models and GraphQL schema
├── package.json      # Backend package configuration
└── tsconfig.json     # Backend TypeScript configuration
```

## Key Files

### Frontend
- **`src/main.tsx`** - App initialization, Amplify configuration, and authentication wrapper
- **`src/App.tsx`** - Main component with todo CRUD operations and real-time subscriptions
- **`vite.config.ts`** - Vite build configuration

### Backend
- **`amplify/backend.ts`** - Defines backend resources (auth + data)
- **`amplify/auth/resource.ts`** - Email-based authentication setup
- **`amplify/data/resource.ts`** - GraphQL schema with Todo model

### Configuration
- **`tsconfig.json`** - TypeScript configuration for frontend
- **`amplify/tsconfig.json`** - TypeScript configuration for backend
- **`eslint.config.js`** - ESLint rules and configuration

## Naming Conventions
- **Components**: PascalCase (e.g., `App.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Types**: PascalCase with descriptive names
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE

## Import Patterns
- **Amplify Types**: Import from generated schema types
- **AWS Amplify**: Use specific imports (e.g., `generateClient`)
- **React**: Use named imports for hooks and components
- **Relative Imports**: Use `../` for parent directories
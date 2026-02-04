# Project Structure

## Root Level
- `package.json` - Frontend dependencies and scripts
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration
- `amplify_outputs.json` - Generated Amplify configuration

## Frontend (`src/`)
```
src/
├── main.tsx          # App entry point with Amplify config
├── App.tsx           # Main application component
├── App.css           # App-specific styles
├── index.css         # Global styles
├── vite-env.d.ts     # Vite type definitions
└── assets/           # Static assets
```

## Backend (`amplify/`)
```
amplify/
├── backend.ts        # Backend resource definitions
├── package.json      # Backend package config
├── tsconfig.json     # Backend TypeScript config
├── auth/
│   └── resource.ts   # Cognito auth configuration
└── data/
    └── resource.ts   # GraphQL schema and data models
```

## Generated Files
- `.amplify/` - Build artifacts and CDK output
- `amplify_outputs.json` - Client configuration (auto-generated)

## Conventions
- Use TypeScript for all source files
- Backend resources defined in separate modules
- Schema types exported from `amplify/data/resource.ts`
- Authentication handled at app root level
- Real-time data patterns using `observeQuery()`
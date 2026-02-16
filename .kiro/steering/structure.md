# Project Structure

## Root Directory
```
/
├── src/                    # Frontend React application
├── amplify/                # Backend infrastructure and Lambda functions
├── public/                 # Static assets
├── .kiro/                  # Kiro AI assistant configuration
├── dist/                   # Production build output
└── node_modules/           # Frontend dependencies
```

## Frontend Structure (`src/`)
```
src/
├── main.tsx               # Application entry point
├── App.tsx                # Main app component with channel list
├── ChannelDetail.tsx      # Channel detail view
├── VideoList.tsx          # Video list component
├── VideoItem.tsx          # Individual video component
├── lib/
│   ├── amplifyClient.ts   # Amplify client configuration
│   └── utils.ts           # Utility functions (with .test.ts)
└── services/
    ├── channelService.ts  # Channel CRUD operations
    └── youtubeService.ts  # YouTube API integration (with .test.ts)
```

## Backend Structure (`amplify/`)
```
amplify/
├── backend.ts             # Main backend configuration
├── auth/
│   └── resource.ts        # Cognito auth configuration
├── data/
│   └── resource.ts        # GraphQL schema and data models
├── functions/
│   └── fetch-channel-videos/
│       ├── handler.ts     # Lambda function implementation
│       ├── handler.test.ts # Lambda function tests
│       ├── resource.ts    # Lambda resource definition
│       ├── package.json   # Function-specific dependencies
│       └── node_modules/  # Function-specific dependencies
└── node_modules/          # Backend dependencies
```

## Data Models (GraphQL Schema)
- **Channel**: User's YouTube channels with owner-based authorization
- **Video**: Videos from channels with metadata (title, description, duration)
- **Ebook**: Generated ebooks from video collections (future feature)
- **EbookVideo**: Junction table linking ebooks to source videos
- **BookGroup**: Thematic groupings of videos for ebook generation

## Key Conventions
- Tests are co-located with source files using `.test.ts` suffix
- Lambda functions have their own `package.json` and dependencies
- All data models use owner-based authorization for multi-tenancy
- GraphQL queries/mutations are defined in `amplify/data/resource.ts`
- Frontend services abstract Amplify client operations
- TypeScript is used throughout (strict mode enabled)

## Authorization Pattern
All models follow owner-based authorization:
- Users can only access their own data
- Owner field is automatically set from Cognito user identity
- Read and delete operations are restricted to owners

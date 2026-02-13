# Project Structure

## Root Directory

```
/
├── src/                    # Frontend React application
├── amplify/                # AWS Amplify backend configuration
├── public/                 # Static assets
├── dist/                   # Production build output
├── .amplify/               # Amplify build artifacts (generated)
├── .kiro/                  # Kiro AI assistant configuration
└── node_modules/           # Dependencies
```

## Frontend (`/src`)

- `main.tsx` - Application entry point, Amplify configuration
- `App.tsx` - Main app component (channel list and management)
- `ChannelDetail.tsx` - Channel detail view with videos
- `VideoList.tsx` - Video list component
- `VideoItem.tsx` - Individual video display component
- `*.css` - Component-specific styles
- `assets/` - Images and static resources

## Backend (`/amplify`)

```
amplify/
├── backend.ts              # Backend resource definitions
├── auth/
│   └── resource.ts         # Cognito authentication config
├── data/
│   └── resource.ts         # Data schema and models
└── functions/
    └── say-hello/          # Lambda function example
        ├── handler.ts      # Function implementation
        ├── resource.ts     # Function configuration
        └── package.json    # Function dependencies
```

## Data Models (Amplify Data)

Defined in `amplify/data/resource.ts`:

- `Channel` - YouTube channel metadata
  - Has many: Videos, Ebooks
  - Fields: name, url
  
- `Video` - YouTube video metadata
  - Belongs to: Channel
  - Fields: youtubeId, title, description, duration, channelId
  - Indexes: byYoutubeId, byChannel
  
- `Ebook` - Generated ebook from videos
  - Belongs to: Channel
  - Has many: EbookVideos
  - Fields: title, pageCount, generatedDate, pdfUrl, channelId
  
- `EbookVideo` - Videos included in ebook
  - Belongs to: Ebook
  - Fields: title, url, ebookId

## Authorization

- All models use owner-based authorization (users can only access their own data)
- Authentication via AWS Cognito User Pools
- Email-based login

## Routing

- `/` - Main channel list (App.tsx)
- `/channel/:encodedUrl` - Channel detail view (ChannelDetail.tsx)

## Configuration Files

- `vite.config.ts` - Vite bundler configuration
- `tsconfig.json` - TypeScript compiler options (frontend)
- `amplify/tsconfig.json` - TypeScript options (backend)
- `eslint.config.js` - ESLint rules
- `amplify.yml` - Amplify CI/CD pipeline configuration
- `amplify_outputs.json` - Generated Amplify configuration (runtime)

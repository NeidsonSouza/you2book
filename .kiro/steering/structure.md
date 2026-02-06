# Project Structure

## Root Layout
```
/                           # Workspace root
├── src/                    # Frontend React application
├── amplify/                # Backend infrastructure code
├── public/                 # Static assets
├── .kiro/                  # Kiro configuration and specs
└── dist/                   # Build output (gitignored)
```

## Frontend (`/src`)
- `main.tsx` - Application entry point with Amplify configuration
- `App.tsx` - Main channel list view with authentication
- `ChannelDetail.tsx` - Individual channel detail view
- `VideoList.tsx` - Video listing component with real-time updates
- `VideoItem.tsx` - Individual video display component
- `*.css` - Component and global styles
- `vite-env.d.ts` - Vite type definitions

## Backend (`/amplify`)
- `backend.ts` - Amplify backend definition and resource wiring
- `auth/resource.ts` - Cognito authentication configuration
- `data/resource.ts` - Data schema with models and mutations
- `functions/youtube-video-fetcher/` - Lambda function for YouTube API integration

## Data Models
Defined in `amplify/data/resource.ts`:
- **Channel** - YouTube channels (owner-authorized)
- **Video** - Channel videos with YouTube metadata (owner-authorized)
- **Ebook** - Generated ebooks from videos (owner-authorized)
- **EbookVideo** - Videos included in ebooks (owner-authorized)

## Key Patterns

### Data Access
- Use `generateClient<Schema>()` from `aws-amplify/data`
- Real-time updates via `observeQuery()` subscriptions
- Owner-based authorization on all models

### Component Structure
- Functional components with hooks
- TypeScript with strict typing using Schema types
- Props interfaces defined inline or exported

### State Management
- Local component state with `useState`
- Real-time sync via Amplify observeQuery subscriptions
- No external state management library

### Navigation
- React Router DOM for client-side routing
- URL encoding for channel URLs in routes
- Pattern: `/channel/:encodedUrl`

### Error Handling
- Try-catch blocks for async operations
- User-facing error messages in UI
- Console logging for debugging

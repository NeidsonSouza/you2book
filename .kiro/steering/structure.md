# Project Structure

```
├── src/                          # React frontend (Vite)
│   ├── main.tsx                  # App entry point, Amplify config, routing
│   ├── App.tsx                   # Main page — channel list, add/delete channels
│   ├── ChannelDetail.tsx         # Channel detail page — ebook list
│   ├── VideoList.tsx             # Video list component for a channel
│   ├── VideoItem.tsx             # Single video display component
│   ├── types/index.ts            # Shared TypeScript types (derived from Amplify schema)
│   ├── lib/
│   │   ├── amplifyClient.ts      # Singleton Amplify data client
│   │   └── utils.ts              # Utility functions (formatDate, formatDuration)
│   ├── hooks/
│   │   └── useChannelEbooks.ts   # Custom hook for fetching ebooks with source videos
│   └── services/
│       ├── channelService.ts     # Channel CRUD operations (cascade delete)
│       └── youtubeService.ts     # YouTube fetch + save operations via Amplify queries
│
├── amplify/                      # Amplify Gen 2 backend definition
│   ├── backend.ts                # Backend orchestration, CDK constructs, AgentCore setup
│   ├── auth/resource.ts          # Cognito auth config
│   ├── data/resource.ts          # Data schema (Channel, Video, Ebook, BookGroup, etc.)
│   └── functions/
│       ├── fetch-channel-videos/ # Lambda: YouTube API integration (TypeScript)
│       │   ├── handler.ts        # Main handler with YouTube API calls + DB operations
│       │   └── resource.ts       # Function definition with secrets
│       └── agent-invoker/        # Lambda: Bedrock AgentCore invoker (Python)
│           ├── index.py          # Handler that calls AgentCore runtime
│           └── resource.ts       # CDK Function construct with Docker bundling
│
├── agentcore/                    # Strands Agent server (deployed to AgentCore)
│   └── src/
│       ├── main.py               # FastAPI app with Strands Agent
│       └── requirements.txt      # Python dependencies
│
└── .kiro/
    ├── specs/                    # Feature specifications
    └── steering/                 # AI assistant steering rules (this directory)
```

## Conventions

- Frontend types in `src/types/` are derived from the Amplify schema (`Schema['ModelName']['type']`)
- All Amplify data access goes through the shared client in `src/lib/amplifyClient.ts`
- Lambda functions live under `amplify/functions/{function-name}/` with their own `resource.ts`
- Tests are co-located with source files using `.test.ts` suffix
- The Amplify data schema in `amplify/data/resource.ts` is the single source of truth for the data model
- Owner-based authorization is used throughout — each user only sees their own data

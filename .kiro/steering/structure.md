# Project Structure

## Project Overview

Kapenz is building a web and mobile app that transforms entire YouTube channels into high-quality, well-written PDF ebooks. Users input one or more YouTube channel URLs, and for each channel, the AI-powered platform automatically analyzes the videos, clusters them into thematic groups based on content similarity and correlation (e.g., turning a series of correlated tutorials or lectures into a single cohesive book), removes redundancies to eliminate repeated information, and synthesizes the content into a clean, readable ebook—delivering the knowledge in a text-first format for people who prefer reading over watching videos.

The core value is making substantial, information-dense YouTube content (like educational series, in-depth tutorials, lectures, self-improvement courses, or expertise-sharing channels) instantly accessible as polished books. The process is user-friendly: paste the channel URL → AI suggests logical video groups → user reviews and flexibly edits (reassign videos, exclude irrelevant ones) → one-click generate per group → receive a redundancy-free, well-structured PDF ebook with natural flow, chapters, and high-quality writing.

These ebooks are delivered as well-written, high-quality PDFs (optimized for readability on any device, with features like table of contents and chapter headings; additional formats like EPUB could be added later for e-reader compatibility). Length varies by channel and group—typically 20–100+ pages depending on the depth and number of videos clustered (e.g., a focused 10–20 video series might yield a concise 30–60 page guide, while a comprehensive channel playlist could produce longer, textbook-like books).

This solves a real pain for lifelong learners who love absorbing knowledge but find video consumption time-intensive, prefer skimming/searching text, or want offline/portable reference material without manual note-taking or transcription.

## Root Layout
```
/src                    # Frontend React application
/amplify                # AWS Amplify backend configuration
/public                 # Static assets
/dist                   # Build output (generated)
```

## Frontend (`/src`)
```
/src
  App.tsx               # Main app component (channel list)
  ChannelDetail.tsx     # Channel detail view
  VideoItem.tsx         # Video display component
  VideoList.tsx         # Video list component
  /lib
    amplifyClient.ts    # Amplify client configuration
    utils.ts            # Utility functions
  /services
    channelService.ts   # Channel CRUD operations
    youtubeService.ts   # YouTube API integration
  /assets               # Images and static resources
```

## Backend (`/amplify`)
```
/amplify
  backend.ts            # Backend resource definitions
  /auth
    resource.ts         # Cognito auth configuration
  /data
    resource.ts         # Data schema (models, queries, custom types)
  /functions
    /say-hello          # Example Lambda (Node.js/TypeScript)
    /suggest-book-groups # Book grouping Lambda (Python)
```

## Data Models
- Channel: User's tracked YouTube channels
- Video: Individual videos from channels
- Ebook: Generated ebooks from video groups
- EbookVideo: Videos associated with ebooks
- BookGroup: Themed groupings of videos

## Key Patterns
- Amplify Data client for database operations
- Owner-based authorization (user can only access their own data)
- Secondary indexes on Video (byYoutubeId, byChannel) and BookGroup (byChannel)
- Custom queries via Lambda functions
- Service layer pattern for business logic

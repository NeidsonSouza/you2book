# AI Video Grouping Design - MVP

## Overview
This document outlines the design for implementing AI-backed automatic video grouping in Kapenz. The system will analyze YouTube video content and cluster videos into thematic groups suitable for ebook generation.

## Design Decisions

### Approach
- **Lazy Summarization**: Generate summaries only when user requests grouping (not during channel addition)
- **Single-Pass Clustering**: Use AI to analyze all summaries and suggest groups in one operation
- **Simple First**: Start with straightforward implementation, evolve to embeddings-based approach later

### Key Components
1. Video transcript fetching
2. AI-powered summarization
3. AI-powered clustering
4. BookGroup persistence

## Data Model Changes

### Video Model Update
Add new field to existing Video model:
```typescript
Video: {
  youtubeId: string (required)
  title: string (required)
  description: string (optional)
  duration: string
  summary: string (optional)  // NEW FIELD
  channelId: id (required)
}
```

## Complete Flow

### When User Clicks "Suggest Groups" Button

#### Step 1: Fetch Videos from DynamoDB
- Query all videos for the specified channel using `byChannel` secondary index
- Load existing video records with any previously generated summaries

#### Step 2: Generate Missing Summaries
For each video that lacks a summary:

1. **Fetch Transcript**
   - Use `youtube-transcript-api` Python library
   - Fetch transcript by youtubeId
   - Fallback: If transcript unavailable (no captions), use title + description

2. **Generate Summary**
   - Send transcript to xAI via Strands Agent
   - Prompt template:
     ```
     Summarize this video transcript in 200-250 words, focusing on:
     - Main topics and themes
     - Key concepts and ideas
     - Core subject matter
     
     Transcript:
     {transcript_text}
     ```
   - Target length: 200-250 words per summary

3. **Update Video Record**
   - Save generated summary back to DynamoDB Video record
   - Summary is cached for future grouping requests

#### Step 3: Cluster Videos into Groups
1. **Prepare Clustering Input**
   - Collect all videos with their summaries, titles, and IDs
   - Format as structured data for AI analysis

2. **Send to AI for Clustering**
   - Use xAI via Strands Agent
   - Prompt template:
     ```
     Analyze these video summaries and group them into logical thematic clusters.
     
     Requirements:
     - Create 3-8 groups based on natural content themes
     - Each group should contain videos with strongly related content
     - Groups should represent coherent topics suitable for a book
     
     Videos:
     {video_summaries_with_ids}
     
     Return for each group:
     - title: Compelling group name
     - themeDescription: What this group is about
     - videoIds: Array of video IDs in this group
     ```

3. **Parse AI Response**
   - Extract group suggestions from AI response
   - Validate structure (title, themeDescription, videoIds)

#### Step 4: Save BookGroups to DynamoDB
For each suggested group:
- Create BookGroup record with:
  - channelId
  - title (from AI)
  - themeDescription (from AI)
  - videoIds (array of video IDs)
  - createdAt (current timestamp)

#### Step 5: Return Results
- Return suggested groups to frontend
- Frontend displays groups for user review/editing

## Technical Implementation

### Lambda Function
- **Name**: `suggest-book-groups` (already exists)
- **Runtime**: Python 3.x
- **Timeout**: 5-10 minutes (to handle summarization of many videos)
- **Memory**: 512-1024 MB

### Dependencies
```
youtube-transcript-api  # Fetch video transcripts
strands                 # Agent framework
strands-xai            # xAI model integration
boto3                  # DynamoDB access
```

### xAI Model Configuration
- **Model**: `grok-4-1-fast-non-reasoning-latest` (already configured)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 2048 (sufficient for summaries and clustering)

### Error Handling
- **No transcript available**: Fall back to title + description
- **AI request fails**: Return error to user with retry option
- **Timeout**: Process videos in batches if needed
- **DynamoDB errors**: Log and return appropriate error messages

## User Experience

### Loading States
1. "Analyzing videos..." (fetching from DB)
2. "Generating summaries for X videos..." (with progress indicator)
3. "Clustering videos into groups..." (AI processing)
4. Display suggested groups

### First Run vs Subsequent Runs
- **First run**: Slower (must generate all summaries)
- **Subsequent runs**: Fast (summaries already cached)
- Communicate this to users with appropriate messaging

## Limitations (MVP)

### Scale Limitations
- **Optimal**: <100 videos per channel
- **Context window**: ~50-100 videos with 200-250 word summaries
- **Reason**: Single-pass AI clustering has context limits

### Content Limitations
- Requires videos to have captions/transcripts
- Videos without captions use title + description (lower quality)

### Performance
- First grouping request takes longer (1-5 minutes for 50 videos)
- Subsequent requests are faster (<30 seconds)

## Future Enhancements (Post-MVP)

### Scalability Improvements
1. **Embedding-based clustering**
   - Generate embeddings for summaries
   - Use cosine similarity for initial clustering
   - AI only for refinement and naming
   - Scales to 1000+ videos

2. **Incremental summarization**
   - Generate summaries during channel addition
   - Spread cost over time
   - Faster grouping experience

3. **Smart batching**
   - Temporal pre-grouping (by upload date)
   - Hierarchical clustering for large channels

### Quality Improvements
1. **User feedback loop**
   - Learn from user edits to groups
   - Improve clustering over time

2. **Multiple clustering strategies**
   - By topic
   - By difficulty level
   - By series/playlist
   - Chronological

3. **Full transcript storage**
   - Store transcripts for ebook generation
   - Avoid re-fetching during book creation

## API Contract

### Request
```typescript
{
  arguments: {
    channelId: string
  }
}
```

### Response
```typescript
{
  success: boolean
  groups: Array<{
    title: string
    themeDescription: string
    videoIds: string[]
  }>
  error?: string
}
```

## Implementation Checklist

- [ ] Update Video model schema with `summary` field
- [ ] Add `youtube-transcript-api` to Lambda dependencies
- [ ] Implement transcript fetching function
- [ ] Implement summarization function with Strands Agent
- [ ] Implement clustering function with Strands Agent
- [ ] Implement BookGroup persistence
- [ ] Add error handling and fallbacks
- [ ] Add progress tracking/logging
- [ ] Update frontend to call suggest groups API
- [ ] Add loading states in UI
- [ ] Test with various channel sizes
- [ ] Document limitations for users

## Notes
- This design prioritizes simplicity and speed to market
- Architecture supports evolution to more sophisticated approaches
- User feedback will guide future enhancements
- Cost-effective for MVP (free transcript API, efficient AI usage)

# Video Grouping Requirements

## Overview
AI-powered feature that analyzes videos from a YouTube channel and suggests thematic groupings for ebook creation. This is an MVP focused solely on the grouping/clustering process.

## User Stories

### 1. Suggest Video Groups
As a user, I want to click a "Suggest Book Groups" button on a channel detail page, so that the AI can analyze all videos and suggest logical thematic groupings for potential ebooks.

### 2. View Suggested Groups
As a user, I want to see the AI-suggested video groups with their theme titles, so that I can understand how the videos have been clustered.

### 3. Review Group Contents
As a user, I want to see which videos are included in each suggested group, so that I can evaluate if the groupings make sense.

## Acceptance Criteria

### 1.1 Button Availability
- A "Suggest Book Groups" button is visible on the channel detail page
- Button is only enabled when the channel has at least 1 video
- Button shows loading state while processing

### 1.2 AI Processing
- System fetches all videos for the selected channel from DynamoDB
- For each video, generates a semantic summary using xAI via Strands Agents
- AI clusters videos into thematic groups based on content similarity
- AI suggests a descriptive title/theme for each group
- Minimum 1 group, maximum 10 groups per channel

### 1.3 Data Persistence
- Suggested groups are stored in a new BookGroup model in DynamoDB
- Each BookGroup has: title, theme description, channelId, list of videoIds
- Groups are associated with the channel via channelId
- Previous suggestions are replaced when new suggestions are generated

### 1.4 UI Display
- Suggested groups are displayed in a clear, organized layout
- Each group shows: suggested title, number of videos, list of video titles
- Groups are displayed in order of relevance/size
- User can expand/collapse each group to see video details

### 1.5 Error Handling
- Clear error message if AI service fails
- Graceful handling of channels with insufficient video data
- Timeout handling for long-running AI operations (max 5 minutes)

## Out of Scope (Not in MVP)
- Editing/reassigning videos between groups
- Excluding videos from groups
- Manual group creation
- Ebook generation from groups
- Transcript fetching (assume transcripts exist or use title/description)
- Group persistence across sessions (groups are regenerated each time)

## Technical Requirements

### Backend
- New AWS Lambda function for video grouping
- Integration with xAI via Strands Agents MCP
- Two-stage processing: summary generation → clustering
- Function timeout: 5 minutes (for AI processing)

### Data Model
- New BookGroup model with fields:
  - id (auto-generated)
  - channelId (foreign key)
  - title (AI-suggested)
  - themeDescription (AI-suggested)
  - videoIds (array of video IDs)
  - createdAt (timestamp)
  - owner (for authorization)

### Frontend
- Add button to ChannelDetail.tsx
- New component or section to display suggested groups
- Loading states and error handling

## Success Metrics
- AI successfully clusters videos into logical groups
- Groups have meaningful, descriptive titles
- Processing completes within 5 minutes for channels with up to 100 videos
- User can clearly see and understand the suggested groupings

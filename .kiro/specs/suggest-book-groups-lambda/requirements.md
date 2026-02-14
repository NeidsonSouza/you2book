# Requirements Document

## Introduction

This document specifies the requirements for completing the suggest-book-groups Lambda function implementation. The function analyzes YouTube videos from a channel and uses AI to cluster them into thematic groups suitable for ebook generation. This is an MVP implementation focused on channels with fewer than 100 videos.

## Glossary

- **Lambda_Function**: The AWS Lambda function that processes video grouping requests
- **Video**: A YouTube video record stored in DynamoDB with metadata
- **BookGroup**: A thematic cluster of related videos suitable for ebook generation
- **Transcript**: The text content of a YouTube video obtained via captions/subtitles
- **Summary**: A 200-250 word AI-generated summary of a video's content
- **Agent**: The Strands Agent framework client used to interact with AI models
- **Bedrock_Nova**: Amazon Bedrock Nova model used for AI summarization and clustering
- **DynamoDB**: AWS database service storing Video and BookGroup records

## Requirements

### Requirement 1: Data Model Extension

**User Story:** As a developer, I want to store video summaries in the database, so that subsequent grouping requests are faster and don't require re-summarization.

#### Acceptance Criteria

1. THE Video model SHALL include an optional 'summary' field of type string
2. WHEN a summary is generated for a video, THE Lambda_Function SHALL persist it to the Video record in DynamoDB
3. WHEN fetching videos for grouping, THE Lambda_Function SHALL retrieve any existing summaries from DynamoDB

### Requirement 2: Transcript Acquisition

**User Story:** As the system, I want to obtain video transcripts, so that I can generate accurate content summaries for clustering.

#### Acceptance Criteria

1. THE Lambda_Function SHALL use the youtube-transcript-api library to fetch video transcripts
2. WHEN a transcript is available for a video, THE Lambda_Function SHALL retrieve the full transcript text
3. IF a transcript is not available for a video, THEN THE Lambda_Function SHALL fall back to using the video's title and description
4. WHEN fetching transcripts fails with an error, THE Lambda_Function SHALL log the error and use the fallback approach

### Requirement 3: Video Summarization

**User Story:** As the system, I want to generate concise summaries of video content, so that the AI can effectively cluster videos by theme.

#### Acceptance Criteria

1. WHEN a video lacks a summary, THE Lambda_Function SHALL generate a summary using the Bedrock_Nova model
2. THE Lambda_Function SHALL send the video transcript (or title+description fallback) to the Bedrock_Nova model for summarization
3. THE Lambda_Function SHALL request summaries of 200-250 words focusing on main topics, key concepts, and core subject matter
4. WHEN a summary is generated, THE Lambda_Function SHALL update the Video record in DynamoDB with the summary
5. WHEN a video already has a summary, THE Lambda_Function SHALL skip summary generation for that video

### Requirement 4: Video Clustering

**User Story:** As a user, I want videos automatically grouped by theme, so that I can generate coherent ebooks from related content.

#### Acceptance Criteria

1. WHEN all videos have summaries, THE Lambda_Function SHALL send the collection of video summaries to the Bedrock_Nova model for clustering
2. THE Lambda_Function SHALL request the AI to create 3-8 thematic groups based on content similarity
3. THE Lambda_Function SHALL provide video IDs, titles, and summaries to the AI for clustering analysis
4. THE Bedrock_Nova model SHALL return groups with a title, theme description, and array of video IDs for each group
5. WHEN the AI returns clustering results, THE Lambda_Function SHALL validate that each group contains a title, themeDescription, and videoIds array

### Requirement 5: BookGroup Persistence

**User Story:** As a user, I want suggested groups saved to the database, so that I can review and edit them before generating ebooks.

#### Acceptance Criteria

1. WHEN clustering is complete, THE Lambda_Function SHALL create a BookGroup record for each suggested group
2. THE Lambda_Function SHALL store the channelId, title, themeDescription, videoIds, and createdAt timestamp in each BookGroup record
3. THE Lambda_Function SHALL persist all BookGroup records to DynamoDB
4. WHEN BookGroup creation succeeds, THE Lambda_Function SHALL return the groups in the response

### Requirement 6: AI Model Configuration

**User Story:** As a developer, I want to use Amazon Bedrock Nova for AI operations, so that the system uses AWS-native AI services.

#### Acceptance Criteria

1. THE Lambda_Function SHALL use Amazon Bedrock Nova model via the Strands Agent framework
2. THE Agent SHALL be configured with appropriate temperature (0.7) for balanced creativity
3. THE Agent SHALL be configured with sufficient max_tokens (2048) for summaries and clustering responses
4. THE Lambda_Function SHALL use the Bedrock Nova model for both summarization and clustering operations

### Requirement 7: Error Handling

**User Story:** As a user, I want clear error messages when grouping fails, so that I understand what went wrong and can retry if needed.

#### Acceptance Criteria

1. WHEN transcript fetching fails for a video, THE Lambda_Function SHALL log the error and continue with title+description fallback
2. WHEN AI summarization fails, THE Lambda_Function SHALL return an error response with a descriptive message
3. WHEN AI clustering fails, THE Lambda_Function SHALL return an error response with a descriptive message
4. WHEN DynamoDB operations fail, THE Lambda_Function SHALL return an error response with a descriptive message
5. WHEN any error occurs, THE Lambda_Function SHALL log the error details to CloudWatch for debugging

### Requirement 8: API Contract

**User Story:** As a frontend developer, I want a consistent API response format, so that I can reliably display grouping results to users.

#### Acceptance Criteria

1. THE Lambda_Function SHALL accept a channelId argument in the event.arguments object
2. WHEN channelId is missing, THE Lambda_Function SHALL return success: false with an appropriate error message
3. WHEN no videos exist for the channel, THE Lambda_Function SHALL return success: false with an appropriate error message
4. WHEN grouping succeeds, THE Lambda_Function SHALL return success: true with an array of groups
5. THE Lambda_Function SHALL return each group with title, themeDescription, and videoIds fields
6. WHEN an error occurs, THE Lambda_Function SHALL return success: false with an error message describing the failure

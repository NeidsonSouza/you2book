# Requirements Document

## Introduction

This specification defines the requirements for refactoring the existing "say-hello" Lambda function into a production-ready "fetch-channel-videos" function that integrates with the YouTube Data API v3 to fetch real channel and video metadata, and persists this data to DynamoDB through AWS Amplify Data.

The refactoring transforms a placeholder function returning fake data into a fully functional backend service that retrieves authentic YouTube content, manages channel records, and stores video metadata with proper deduplication and error handling.

## Glossary

- **Lambda_Function**: The AWS Lambda serverless function that processes requests
- **YouTube_API**: YouTube Data API v3 service for retrieving channel and video information
- **Secrets_Manager**: AWS Secrets Manager service for secure API key storage
- **Channel_Model**: DynamoDB table managed by Amplify Data representing YouTube channels
- **Video_Model**: DynamoDB table managed by Amplify Data representing individual videos
- **Amplify_Data**: AWS Amplify's data layer providing type-safe database operations
- **Frontend_Service**: The React application's service layer that invokes backend queries
- **Schema**: The Amplify Data schema defining models, queries, and custom types
- **API_Key**: YouTube Data API authentication credential stored in Secrets Manager

## Requirements

### Requirement 1: Lambda Function Renaming

**User Story:** As a developer, I want the Lambda function renamed from "say-hello" to "fetch-channel-videos", so that the function name accurately reflects its purpose.

#### Acceptance Criteria

1. THE Lambda_Function SHALL be renamed from "say-hello" to "fetch-channel-videos"
2. WHEN the function is renamed, THE directory structure SHALL change from "amplify/functions/say-hello" to "amplify/functions/fetch-channel-videos"
3. WHEN the function is renamed, THE resource definition file SHALL be updated to reference "fetch-channel-videos"
4. WHEN the function is renamed, THE backend configuration SHALL import and register the renamed function

### Requirement 2: Schema Updates

**User Story:** As a developer, I want the schema updated to reflect the new function name and parameters, so that the API contract is clear and type-safe.

#### Acceptance Criteria

1. THE Schema SHALL define a query named "fetchChannelVideos" instead of "sayHello"
2. WHEN defining the query, THE Schema SHALL accept a "channelUrl" argument of type string
3. THE Schema SHALL define a custom type "FetchChannelVideosResponse" with fields: message (string), timestamp (string), success (boolean), and videos (array of VideoMetadata)
4. THE Schema SHALL remove the "SayHelloResponse" custom type
5. THE Schema SHALL remove the "sayHello" query definition

### Requirement 3: Channel Model Enhancement

**User Story:** As a system, I want to store the YouTube channel ID in the Channel model, so that I can uniquely identify channels and avoid duplicate API calls.

#### Acceptance Criteria

1. THE Channel_Model SHALL include a "youtubeChannelId" field of type string
2. WHEN a channel is created, THE youtubeChannelId field SHALL be populated with the extracted channel ID from YouTube
3. THE Channel_Model SHALL maintain existing fields: name, url, and relationships to ebooks, videos, and bookGroups

### Requirement 4: YouTube API Integration

**User Story:** As a backend service, I want to retrieve video metadata from YouTube, so that users can see real channel content.

#### Acceptance Criteria

1. WHEN the Lambda_Function executes, THE Lambda_Function SHALL retrieve the YouTube API key from Secrets_Manager using secret name "youtube-api-key"
2. WHEN a channelUrl is provided, THE Lambda_Function SHALL extract the YouTube channel ID from the URL
3. WHEN the channel ID is extracted, THE Lambda_Function SHALL call YouTube_API to fetch channel metadata including the channel name
4. WHEN channel metadata is retrieved, THE Lambda_Function SHALL call YouTube_API to fetch all videos from the channel
5. WHEN fetching videos, THE Lambda_Function SHALL retrieve video metadata including: youtubeId, title, description, and duration
6. IF the YouTube_API returns an error, THEN THE Lambda_Function SHALL return a failure response with an error message
7. IF the channelUrl is invalid or cannot be parsed, THEN THE Lambda_Function SHALL return a failure response with an error message

### Requirement 5: Database Operations

**User Story:** As a backend service, I want to persist channel and video data to DynamoDB, so that the application can access this data without repeated API calls.

#### Acceptance Criteria

1. WHEN channel metadata is fetched, THE Lambda_Function SHALL check if a Channel_Model record exists with the same youtubeChannelId
2. IF no Channel_Model record exists, THEN THE Lambda_Function SHALL create a new record with name, url, and youtubeChannelId
3. IF a Channel_Model record exists, THEN THE Lambda_Function SHALL update the existing record with the latest channel name
4. WHEN videos are fetched, THE Lambda_Function SHALL save each video to the Video_Model
5. WHEN saving a video, THE Lambda_Function SHALL check if a video with the same youtubeId already exists
6. IF a video with the same youtubeId exists, THEN THE Lambda_Function SHALL skip saving that video to avoid duplicates
7. WHEN saving videos, THE Lambda_Function SHALL store: youtubeId, title, description, duration, and channelId
8. IF database operations fail, THEN THE Lambda_Function SHALL log the error and continue processing remaining videos

### Requirement 6: Response Format

**User Story:** As a frontend developer, I want a consistent response format from the Lambda function, so that I can reliably handle success and error cases.

#### Acceptance Criteria

1. WHEN the Lambda_Function completes successfully, THE Lambda_Function SHALL return a response with success set to true
2. WHEN the Lambda_Function completes successfully, THE response SHALL include a descriptive message
3. WHEN the Lambda_Function completes successfully, THE response SHALL include an ISO 8601 timestamp
4. WHEN the Lambda_Function completes successfully, THE response SHALL include an array of video metadata objects
5. WHEN the Lambda_Function encounters an error, THE Lambda_Function SHALL return a response with success set to false
6. WHEN an error occurs, THE response SHALL include an error message describing what went wrong

### Requirement 7: Frontend Service Updates

**User Story:** As a frontend developer, I want the service layer updated to call the new function, so that the application uses the refactored backend.

#### Acceptance Criteria

1. THE Frontend_Service SHALL call "client.queries.fetchChannelVideos" instead of "client.queries.sayHello"
2. WHEN calling the query, THE Frontend_Service SHALL pass the channelUrl parameter
3. THE Frontend_Service SHALL handle the response from the new query
4. THE Frontend_Service SHALL maintain backward compatibility with existing error handling logic

### Requirement 8: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose issues in production.

#### Acceptance Criteria

1. WHEN the Lambda_Function encounters an error, THE Lambda_Function SHALL log the error with sufficient context
2. WHEN Secrets_Manager access fails, THEN THE Lambda_Function SHALL log the specific error and return a failure response
3. WHEN YouTube_API calls fail, THEN THE Lambda_Function SHALL log the API error details and return a failure response
4. WHEN database operations fail, THEN THE Lambda_Function SHALL log the database error and continue processing
5. WHEN URL parsing fails, THEN THE Lambda_Function SHALL log the invalid URL and return a failure response

### Requirement 9: Dependencies and Configuration

**User Story:** As a developer, I want the Lambda function to have access to necessary dependencies and permissions, so that it can execute successfully.

#### Acceptance Criteria

1. THE Lambda_Function SHALL have permission to read from Secrets_Manager
2. THE Lambda_Function SHALL have permission to perform CRUD operations on Channel_Model and Video_Model
3. THE Lambda_Function SHALL include the necessary npm packages for YouTube API integration
4. THE Lambda_Function SHALL include the AWS SDK for Secrets Manager access
5. THE Lambda_Function SHALL be configured with appropriate timeout and memory settings for API calls

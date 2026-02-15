# Implementation Plan: Fetch Channel Videos Refactor

## Overview

This implementation plan refactors the "say-hello" Lambda function into "fetch-channel-videos" with real YouTube API integration. The work is organized into discrete steps: renaming and restructuring, schema updates, Lambda implementation with YouTube API integration, database operations, frontend service updates, and comprehensive testing.

## Tasks

- [x] 1. Rename Lambda function and update references
  - [x] 1.1 Rename function directory from `amplify/functions/say-hello` to `amplify/functions/fetch-channel-videos`
    - Move all files (handler.ts, resource.ts, package.json)
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 Update function resource definition
    - Update `amplify/functions/fetch-channel-videos/resource.ts` to export `fetchChannelVideos` with name 'fetch-channel-videos'
    - _Requirements: 1.3_
  
  - [x] 1.3 Update backend configuration imports
    - Update `amplify/backend.ts` to import and register `fetchChannelVideos` instead of `sayHello`
    - _Requirements: 1.4_

- [x] 2. Update Amplify Data schema
  - [x] 2.1 Add youtubeChannelId field to Channel model
    - Add `youtubeChannelId: a.string()` to Channel model definition
    - _Requirements: 3.1_
  
  - [x] 2.2 Create new custom type and query definition
    - Rename `SayHelloResponse` to `FetchChannelVideosResponse`
    - Create `fetchChannelVideos` query with `channelUrl` argument
    - Update query to use new function handler
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [x] 2.3 Remove old schema definitions
    - Remove `sayHello` query definition
    - Remove `SayHelloResponse` custom type (if not already renamed)
    - _Requirements: 2.4, 2.5_

- [x] 3. Set up Lambda function dependencies and configuration
  - [x] 3.1 Create package.json for Lambda function
    - Add dependencies: @aws-sdk/client-secrets-manager, axios
    - Add devDependencies: @types/node, aws-sdk-client-mock
    - _Requirements: 9.3, 9.4_
  
  - [x] 3.2 Update Lambda resource configuration
    - Set timeout to 300 seconds
    - Set memory to 512 MB
    - Add environment variable for secret name
    - _Requirements: 9.5_

- [ ] 4. Implement core Lambda handler utilities
  - [ ] 4.1 Implement Secrets Manager integration
    - Create `getYouTubeApiKey()` function to retrieve API key from Secrets Manager
    - Handle errors and return descriptive messages
    - _Requirements: 4.1, 8.2_
  
  - [ ] 4.2 Implement URL parsing logic
    - Create `extractChannelId(url)` function supporting multiple URL formats
    - Handle /channel/, /@handle, /c/, /user/ formats
    - Return error for invalid URLs
    - _Requirements: 4.2, 4.7, 8.5_
  
  - [ ]* 4.3 Write property test for URL parsing
    - **Property 1: URL Parsing Extracts Channel ID**
    - **Validates: Requirements 4.2**
    - Generate various valid YouTube URL formats
    - Verify all extract non-empty channel IDs

- [ ] 5. Implement YouTube API integration
  - [ ] 5.1 Implement channel metadata fetching
    - Create `fetchChannelMetadata(channelId, apiKey)` function
    - Call YouTube channels.list API
    - Parse and return channel name
    - Handle API errors (404, 403, 500)
    - _Requirements: 4.3, 4.6, 8.3_
  
  - [ ] 5.2 Implement video fetching with pagination
    - Create `fetchAllVideos(channelId, apiKey)` function
    - Call YouTube search.list API with pagination
    - Call YouTube videos.list API for video details
    - Loop through all pages until no nextPageToken
    - _Requirements: 4.4, 4.5_
  
  - [ ]* 5.3 Write property test for pagination completeness
    - **Property 6: Pagination Completeness**
    - **Validates: Requirements 4.4**
    - Mock API with multiple pages of videos
    - Verify all videos across pages are fetched
  
  - [ ]* 5.4 Write property test for video metadata completeness
    - **Property 4: Video Metadata Completeness**
    - **Validates: Requirements 4.5, 5.7**
    - Generate random video data from mocked API
    - Verify all videos have required fields

- [ ] 6. Checkpoint - Verify API integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement database operations
  - [ ] 7.1 Implement channel upsert logic
    - Create `upsertChannel(channelData, owner)` function
    - Query for existing channel by youtubeChannelId
    - Create new channel if not exists
    - Update existing channel name if exists
    - Return channel ID
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 7.2 Write property tests for channel operations
    - **Property 2: Channel Creation Completeness**
    - **Validates: Requirements 3.2, 5.2**
    - **Property 3: Channel Update Preserves Identity**
    - **Validates: Requirements 5.3**
    - Test new channel creation has all fields
    - Test existing channel update preserves ID
  
  - [ ] 7.3 Implement video save with deduplication
    - Create `saveVideos(videos, channelId, owner)` function
    - Query for existing videos by youtubeId
    - Skip videos that already exist
    - Save new videos with all metadata
    - Handle individual save failures gracefully
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ]* 7.4 Write property tests for video operations
    - **Property 5: Video Deduplication (Idempotence)**
    - **Validates: Requirements 5.6**
    - **Property 9: Error Resilience in Batch Operations**
    - **Validates: Requirements 5.8**
    - Test running twice doesn't create duplicates
    - Test partial failures don't stop processing

- [ ] 8. Implement main handler and response formatting
  - [ ] 8.1 Implement main handler orchestration
    - Create main `handler(event)` function
    - Orchestrate: get API key → parse URL → fetch channel → fetch videos → upsert channel → save videos
    - Build response object with success, message, timestamp, videos
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ] 8.2 Implement error handling and response formatting
    - Wrap operations in try-catch blocks
    - Return failure responses for errors
    - Format timestamps as ISO 8601
    - Include descriptive error messages
    - _Requirements: 4.6, 4.7, 6.5, 6.6, 8.1_
  
  - [ ]* 8.3 Write property tests for response formatting
    - **Property 7: Error Responses Are Well-Formed**
    - **Validates: Requirements 4.6, 4.7, 6.5, 6.6**
    - **Property 8: Success Responses Are Complete**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
    - **Property 10: Timestamp Format Validity**
    - **Validates: Requirements 6.3**
    - Test error responses have success=false and message
    - Test success responses have all required fields
    - Test timestamps are valid ISO 8601

- [ ] 9. Update frontend service layer
  - [ ] 9.1 Update youtubeService.ts function call
    - Change from `client.queries.sayHello` to `client.queries.fetchChannelVideos`
    - Update parameter from `name` to `channelUrl`
    - Maintain existing error handling
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ]* 9.2 Write unit tests for frontend service
    - Test successful video fetch
    - Test error handling
    - Test empty response handling
    - _Requirements: 7.3, 7.4_

- [ ] 10. Final checkpoint and integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- The Lambda function requires IAM permissions for Secrets Manager and DynamoDB (configured automatically by Amplify)
- YouTube API key must be stored in AWS Secrets Manager with name "youtube-api-key" before deployment

# Implementation Plan: Suggest Book Groups Lambda

## Overview

This plan implements the suggest-book-groups Lambda function that analyzes YouTube videos and uses Amazon Bedrock Nova to cluster them into thematic groups for ebook generation. The implementation builds on existing video data in DynamoDB (populated by the say-hello function) and adds AI-powered summarization and clustering capabilities.

## Tasks

- [ ] 1. Update data schema and dependencies
  - [x] 1.1 Add 'summary' field to Video model in amplify/data/resource.ts
    - Add `summary: a.string()` to the Video model definition
    - Deploy schema changes
    - _Requirements: 1.1_
  
  - [ ] 1.2 Update Lambda dependencies
    - Add youtube-transcript-api==0.6.1 to requirements.txt
    - Add strands-bedrock to requirements.txt
    - Remove strands-xai from requirements.txt
    - _Requirements: 2.1, 6.1_
  
  - [ ] 1.3 Update environment variables
    - Add BOOKGROUP_TABLE_NAME to Lambda configuration
    - Verify VIDEO_TABLE_NAME is set
    - _Requirements: 5.2_

- [ ] 2. Implement transcript fetching
  - [ ] 2.1 Create fetch_transcript function
    - Implement function to fetch transcripts using youtube-transcript-api
    - Handle TranscriptsDisabled and NoTranscriptFound exceptions
    - Implement fallback to title+description format
    - Log errors and use fallback for any exception
    - _Requirements: 2.2, 2.3, 2.4_
  
  - [ ]* 2.2 Write property test for transcript fallback
    - **Property 4: Transcript Fallback**
    - **Validates: Requirements 2.3, 2.4, 7.1**

- [ ] 3. Implement AI summarization
  - [ ] 3.1 Update create_agent_client to use Bedrock Nova
    - Replace xAIModel with BedrockModel
    - Use model_id "amazon.nova-pro-v1:0"
    - Keep temperature 0.7 and max_tokens 2048
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 3.2 Create generate_summary function
    - Implement function that takes agent, transcript, and video title
    - Format prompt with summarization instructions (200-250 words)
    - Send prompt to Bedrock Nova via agent
    - Extract and validate summary from response
    - Raise exception if response is empty or invalid
    - _Requirements: 3.1, 3.2_
  
  - [ ] 3.3 Create update_video_summary function
    - Get VIDEO_TABLE_NAME from environment
    - Update Video record with summary field
    - Use conditional update to handle deleted records
    - Log errors but don't fail the entire operation
    - _Requirements: 1.2, 3.4_
  
  - [ ]* 3.4 Write property test for summary persistence
    - **Property 1: Summary Persistence**
    - **Validates: Requirements 1.2, 3.4**

- [ ] 4. Implement video clustering
  - [ ] 4.1 Create cluster_videos function
    - Format videos into structured text (ID, title, summary)
    - Create clustering prompt requesting 3-8 groups
    - Send prompt to Bedrock Nova via agent
    - Parse JSON response from AI
    - Validate response structure (title, themeDescription, videoIds)
    - Verify all videoIds exist in input videos
    - Raise exception if response is invalid
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 4.2 Write property test for clustering response validation
    - **Property 9: Clustering Response Validation**
    - **Validates: Requirements 4.4, 4.5, 9.5**

- [ ] 5. Implement BookGroup persistence
  - [ ] 5.1 Create save_book_groups function
    - Get BOOKGROUP_TABLE_NAME from environment
    - For each group, create DynamoDB item with all required fields
    - Include channelId, title, themeDescription, videoIds, createdAt, owner
    - Use batch write for efficiency
    - Raise exception if any write fails
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 5.2 Write property test for BookGroup field completeness
    - **Property 11: BookGroup Field Completeness**
    - **Validates: Requirements 5.2**

- [ ] 6. Integrate components in main handler
  - [ ] 6.1 Implement summary generation loop
    - Iterate through fetched videos
    - Check if video has existing summary (skip if present)
    - Fetch transcript for videos without summaries
    - Generate summary using AI
    - Update video record with summary
    - Log progress for each video processed
    - _Requirements: 3.1, 3.5, 8.4_
  
  - [ ] 6.2 Implement clustering and persistence flow
    - Verify all videos have summaries after generation loop
    - Call cluster_videos with all videos
    - Extract owner from event.identity.sub
    - Call save_book_groups with clustering results
    - Return success response with groups
    - _Requirements: 4.1, 5.1, 5.4, 9.4_
  
  - [ ] 6.3 Add comprehensive error handling
    - Wrap all operations in try-catch blocks
    - Return error response for missing channelId
    - Return error response for empty video list
    - Return error response for AI failures
    - Return error response for DynamoDB failures
    - Log all errors to CloudWatch
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 9.2, 9.3, 9.6_
  
  - [ ]* 6.4 Write property test for error response format
    - **Property 15: Error Response Format**
    - **Validates: Requirements 7.2, 7.3, 7.4, 9.2, 9.3, 9.6**

- [ ] 7. Update IAM permissions
  - [ ] 7.1 Add Bedrock permissions to Lambda role
    - Add bedrock:InvokeModel permission for Nova model
    - Verify DynamoDB permissions for Video and BookGroup tables
    - _Requirements: 6.1_

- [ ] 8. Register Lambda function with Amplify Data
  - [ ] 8.1 Add suggestBookGroups query to schema
    - Import suggest-book-groups function resource
    - Create query definition with channelId argument
    - Return SuggestBookGroupsResponse type
    - Set authorization to authenticated users
    - Wire handler to Lambda function
    - _Requirements: 9.1, 9.4_

- [ ] 9. Final checkpoint
  - Verify Lambda deploys successfully
  - Check CloudWatch logs for any deployment errors
  - Ensure all environment variables are set
  - Confirm IAM permissions are correct
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional property tests (MVP doesn't require tests)
- The say-hello function already populates Video records in DynamoDB
- This function only adds summaries and creates BookGroups
- First run will be slow (2-5 minutes for 50 videos)
- Subsequent runs will be fast (10-30 seconds) due to cached summaries
- Optimized for channels with <100 videos

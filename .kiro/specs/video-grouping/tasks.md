# Video Grouping Implementation Tasks

## 1. Data Model Setup
- [ ] 1.1 Add BookGroup model to amplify/data/resource.ts
- [ ] 1.2 Add bookGroups relationship to Channel model
- [ ] 1.3 Add custom types for suggestBookGroups query response
- [ ] 1.4 Deploy schema changes and verify in sandbox

## 2. Lambda Function Setup
- [ ] 2.1 Create amplify/functions/suggest-book-groups directory structure
- [ ] 2.2 Create package.json with Strands Agents dependencies
- [ ] 2.3 Create resource.ts for Lambda configuration
- [ ] 2.4 Create handler.ts with basic structure and exports

## 3. Lambda Function - Core Logic
- [ ] 3.1 Implement video fetching from DynamoDB
  - Query videos by channelId
  - Validate minimum 3 videos
  - Handle errors
- [ ] 3.2 Implement summary generation (Stage 1)
  - Create Strands Agent client
  - Generate summary for each video using xAI
  - Store summaries in memory map
  - Handle API errors and retries
- [ ] 3.3 Implement video clustering (Stage 2)
  - Prepare clustering input from summaries
  - Call xAI with clustering prompt
  - Parse JSON response
  - Validate clustering results
- [ ] 3.4 Implement BookGroup persistence
  - Delete existing groups for channel
  - Create new BookGroup records
  - Handle DynamoDB errors

## 4. Backend Integration
- [ ] 4.1 Register suggestBookGroups function in amplify/backend.ts
- [ ] 4.2 Add query definition to data schema
- [ ] 4.3 Configure environment variables for xAI credentials
- [ ] 4.4 Test Lambda function locally with sandbox

## 5. Frontend - Button and State
- [ ] 5.1 Add "Suggest Book Groups" button to ChannelDetail.tsx
- [ ] 5.2 Implement state management (loading, error, groups)
- [ ] 5.3 Implement handleSuggestGroups handler
- [ ] 5.4 Add loading indicator and error display

## 6. Frontend - Display Component
- [ ] 6.1 Create BookGroupsList.tsx component
- [ ] 6.2 Implement group display with title and description
- [ ] 6.3 Implement video list within each group
- [ ] 6.4 Add basic styling for groups display

## 7. Frontend Integration
- [ ] 7.1 Integrate BookGroupsList into ChannelDetail.tsx
- [ ] 7.2 Fetch and display existing book groups on page load
- [ ] 7.3 Update groups display after suggestion completes
- [ ] 7.4 Test UI flow end-to-end

## 8. Testing
- [ ] 8.1 Write unit test for video fetching logic
- [ ] 8.2 Write unit test for clustering result parsing
- [ ] 8.3 Write integration test for complete flow
- [ ] 8.4 Manual testing with real channel data

## 9. Error Handling and Polish
- [ ] 9.1 Add comprehensive error handling in Lambda
- [ ] 9.2 Add user-friendly error messages in UI
- [ ] 9.3 Add timeout handling (5-minute limit)
- [ ] 9.4 Test edge cases (3 videos, 50+ videos, API failures)

## 10. Documentation and Deployment
- [ ] 10.1 Update README with new feature documentation
- [ ] 10.2 Test in sandbox environment
- [ ] 10.3 Deploy to production
- [ ] 10.4 Verify production deployment

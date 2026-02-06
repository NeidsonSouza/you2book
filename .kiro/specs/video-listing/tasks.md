# Implementation Plan: Video Listing Feature

## Overview

This implementation plan converts the video listing design into discrete coding tasks. The approach focuses on building core functionality incrementally, starting with backend schema and API integration, then moving to frontend components. Each task builds on previous work to create a working video listing feature.

## Tasks

- [x] 1. Extend GraphQL schema with Video model
  - Add Video model to `amplify/data/resource.ts` with required fields
  - Update Channel model to include hasMany relationship with videos
  - Configure proper indexes and authorization rules
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 2. Create YouTube API integration Lambda function
  - [x] 2.1 Set up Lambda function structure and dependencies
    - Create new Lambda function in Amplify backend configuration
    - Install YouTube Data API v3 client library
    - Configure environment variables for API key
    - _Requirements: 1.1_
  
  - [x] 2.2 Implement YouTube channel video fetching logic
    - Extract channel ID from YouTube URL
    - Call YouTube Data API to get channel's uploaded videos
    - Transform API response to match GraphQL Video schema
    - Handle API errors and rate limiting
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Create GraphQL resolver for video fetching
  - [x] 3.1 Implement custom mutation resolver
    - Create `fetchChannelVideos` mutation resolver
    - Connect resolver to YouTube API Lambda function
    - Handle authentication and owner-based authorization
    - _Requirements: 2.1, 5.4_
  
  - [x] 3.2 Implement video storage logic
    - Store fetched videos in DynamoDB with proper relationships
    - Handle duplicate video detection and updates
    - Ensure referential integrity with channels
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Create video listing React components
  - [x] 4.1 Create VideoList component
    - Build component to display videos for a specific channel
    - Implement real-time data fetching with observeQuery
    - Add loading states and error handling
    - _Requirements: 3.1, 3.2, 4.2, 4.3, 4.4_
  
  - [x] 4.2 Create VideoItem component
    - Build individual video display component
    - Show title, description, and duration
    - Implement responsive layout
    - _Requirements: 3.1_

- [x] 5. Integrate video fetching with channel management
  - [x] 5.1 Trigger video fetch on channel creation/update
    - Modify channel creation/update flow to automatically fetch videos
    - Add loading indicators during video fetching process
    - Handle errors gracefully with user feedback
    - _Requirements: 4.1_
  
  - [x] 5.2 Implement cascade deletion
    - Ensure videos are deleted when parent channel is deleted
    - Update GraphQL schema relationships if needed
    - _Requirements: 2.5_

- [ ] 6. Add video listing to main application
  - [ ] 6.1 Update channel display to show videos
    - Integrate VideoList component into existing channel views
    - Add navigation between channel info and video list
    - Ensure proper owner-based filtering
    - _Requirements: 3.2, 5.1, 5.2, 5.3_
  
  - [ ] 6.2 Handle empty states and error scenarios
    - Display appropriate messages when no videos are found
    - Show error messages for API failures
    - Provide user guidance for common issues
    - _Requirements: 3.4_

- [ ] 7. Final integration and testing
  - Ensure all components work together seamlessly
  - Verify real-time updates across the application
  - Test error handling and edge cases
  - Confirm owner-based authorization works correctly

## Notes

- This is an MVP implementation focused on core functionality
- Each task references specific requirements for traceability
- Tasks build incrementally to ensure working functionality at each step
- Real-time updates are handled through Amplify's observeQuery pattern
- All data access respects owner-based authorization rules
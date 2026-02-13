# Implementation Plan: Channel Detail Integration

## Overview

This implementation plan refactors the ChannelDetail component to integrate with Amplify Data models, replacing hardcoded fake data with real backend queries. The implementation follows an incremental approach: first creating shared utilities, then adding data fetching logic, implementing state management, and finally adding comprehensive tests.

## Tasks

- [x] 1. Create shared date formatting utility
  - Create `src/lib/utils.ts` file
  - Implement `formatDate` function that accepts Date, string, null, or undefined
  - Handle null/undefined by returning "Unknown date"
  - Handle invalid dates by returning "Invalid date"
  - Format valid dates as "MMM DD, YYYY" using toLocaleDateString
  - Add error handling with try-catch block
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 1.1 Write property test for date formatting
  - **Property 3: Date formatting consistency**
  - **Validates: Requirements 3.2, 3.3**

- [ ]* 1.2 Write unit tests for date utility edge cases
  - Test null and undefined inputs return "Unknown date"
  - Test invalid date strings return "Invalid date"
  - Test Date objects format correctly
  - Test ISO datetime strings format correctly
  - _Requirements: 3.5_

- [x] 2. Set up Amplify Data client in ChannelDetail component
  - Import `generateClient` from 'aws-amplify/data'
  - Import Schema type from '../amplify/data/resource'
  - Create typed client instance: `const client = generateClient<Schema>()`
  - Remove hardcoded `fakeEbooks` array and all references
  - Import `formatDate` utility from '../lib/utils'
  - _Requirements: 1.1, 1.2, 1.3, 3.4_

- [x] 3. Add state management for data fetching
  - Add state for ebooks array: `useState<Schema['Ebook']['type'][]>([])`
  - Add state for loading: `useState<boolean>(true)`
  - Add state for error: `useState<string | null>(null)`
  - Extract channelId from the decoded URL (will need to query Channel model first or use URL as identifier)
  - _Requirements: 4.1, 5.1_

- [ ] 4. Implement data fetching logic with useEffect
  - [x] 4.1 Create async fetchEbooks function inside useEffect
    - Set loading to true at start
    - Set error to null at start
    - Query Ebook model with filter: `{ channelId: { eq: channelId } }`
    - For each ebook, load related sourceVideos using `ebook.sourceVideos()`
    - Use Promise.all for parallel loading of source videos
    - Set ebooks state with fetched data
    - Handle errors with try-catch, log to console, set user-friendly error message
    - Set loading to false in finally block
    - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2, 5.3_

  - [x] 4.2 Add useEffect dependency array with channelId
    - Only fetch if channelId exists
    - _Requirements: 2.1_

- [ ]* 4.3 Write unit test for data fetching with mocked Amplify client
  - Mock generateClient to return mock client
  - Mock Ebook.list to return test data
  - Mock sourceVideos() relationship loading
  - Verify correct query filter is used
  - Verify sourceVideos are loaded for each ebook
  - _Requirements: 2.1, 2.2_

- [x] 5. Implement loading state UI
  - Add conditional rendering: if loading is true, show loading indicator
  - Use Tailwind classes for centered loading message
  - Display "Loading ebooks..." text with appropriate styling
  - Prevent rendering of ebook cards during loading
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 5.1 Write unit test for loading state
  - Render component with loading=true
  - Verify loading indicator is displayed
  - Verify ebook cards are not rendered
  - _Requirements: 4.1, 4.2_

- [x] 6. Implement error state UI
  - Add conditional rendering: if error is not null, show error message
  - Display error message with Tailwind classes (red text, centered)
  - Ensure header and navigation remain visible during error state
  - Use appropriate ARIA attributes (role="alert")
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ]* 6.1 Write unit test for error state
  - Render component with error message set
  - Verify error message is displayed
  - Verify header and back button remain visible
  - Verify ARIA alert role is present
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 7. Update ebook rendering to use real data
  - [x] 7.1 Update ebook card mapping to use fetched ebooks state
    - Map over ebooks state instead of fakeEbooks
    - Use ebook.id for React key
    - Display ebook.title, ebook.pageCount, ebook.generatedDate
    - Use formatDate utility for generatedDate display
    - Display ebook.pdfUrl in download link href
    - _Requirements: 2.3, 7.2, 7.4_

  - [x] 7.2 Update source videos rendering
    - Map over ebook.sourceVideos array
    - Display video.title and video.url for each source video
    - Ensure links have target="_blank" and rel="noopener noreferrer"
    - _Requirements: 2.5, 7.3_

  - [x] 7.3 Update empty state condition
    - Check if ebooks.length === 0 (instead of fakeEbooks.length)
    - Display "No ebooks yet for this channel..." message
    - _Requirements: 7.5_

- [ ]* 7.4 Write property test for ebook rendering completeness
  - **Property 1: Ebook rendering completeness**
  - **Validates: Requirements 2.3, 7.2**

- [ ]* 7.5 Write property test for source video rendering
  - **Property 2: Source video rendering**
  - **Validates: Requirements 2.5, 7.3**

- [ ]* 7.6 Write property test for download link correctness
  - **Property 4: Download link correctness**
  - **Validates: Requirements 7.4**

- [ ]* 7.7 Write unit test for empty state
  - Render component with empty ebooks array
  - Verify empty state message is displayed
  - _Requirements: 7.5_

- [x] 8. Verify and maintain existing functionality
  - Ensure back button navigation still works (uses navigate('/'))
  - Ensure URL decoding works correctly (decodeURIComponent)
  - Verify all Tailwind classes are applied consistently
  - Remove any unused imports or variables
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.6_

- [ ]* 8.1 Write unit test for navigation
  - Mock useNavigate hook
  - Simulate back button click
  - Verify navigate('/') is called
  - _Requirements: 7.1_

- [ ]* 8.2 Write property test for URL decoding
  - **Property 5: URL decoding preservation**
  - **Validates: Requirements 7.6**

- [x] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and property tests
  - Verify component renders correctly with real data
  - Test loading, error, and empty states manually
  - Ensure no console errors or warnings
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties across random inputs
- Unit tests validate specific examples, state transitions, and edge cases
- The implementation follows an incremental approach: utilities → data layer → UI → tests
- Consider using React Testing Library for component tests and fast-check for property tests

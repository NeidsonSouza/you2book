# Requirements Document

## Introduction

This specification defines the requirements for refactoring the ChannelDetail component to integrate with actual Amplify Data models, removing hardcoded fake data and improving code organization and user experience.

## Glossary

- **ChannelDetail Component**: The React component that displays ebooks generated from a YouTube channel's videos
- **Amplify Data**: AWS Amplify's data layer using DynamoDB with GraphQL API
- **Ebook Model**: The data model representing a generated ebook with metadata (title, page count, generation date, PDF URL)
- **EbookVideo Model**: The data model representing videos included in an ebook
- **Owner Authorization**: Amplify's authorization pattern where users can only access their own data
- **Date Formatter**: A utility function that formats Date objects into human-readable strings
- **Loading State**: UI state displayed while data is being fetched from the backend
- **Error State**: UI state displayed when data fetching fails

## Requirements

### Requirement 1: Remove Hardcoded Data

**User Story:** As a developer, I want to remove hardcoded fake ebook data from the ChannelDetail component, so that the component uses real data from the backend.

#### Acceptance Criteria

1. WHEN the ChannelDetail component renders, THE Component SHALL NOT use the hardcoded fakeEbooks array
2. WHEN the component needs ebook data, THE Component SHALL fetch data from Amplify Data models
3. THE Component SHALL remove all fake data constants and imports related to hardcoded ebooks

### Requirement 2: Integrate Amplify Data Models

**User Story:** As a user, I want to see my actual generated ebooks from the database, so that I can access and download the ebooks I've created.

#### Acceptance Criteria

1. WHEN the ChannelDetail component mounts, THE Component SHALL query the Ebook model filtered by channelId
2. WHEN fetching ebooks, THE Component SHALL include the related EbookVideo records through the sourceVideos relationship
3. WHEN the query succeeds, THE Component SHALL display the fetched ebooks in the UI
4. THE Component SHALL use owner-based authorization to ensure users only see their own ebooks
5. WHEN an ebook has associated source videos, THE Component SHALL display the video titles and URLs from EbookVideo records

### Requirement 3: Extract Date Formatting Utility

**User Story:** As a developer, I want date formatting logic in a shared utility file, so that it can be reused across components and maintain consistency.

#### Acceptance Criteria

1. THE System SHALL create a date formatting utility function in a shared utils file
2. WHEN formatting dates, THE Utility SHALL accept a Date or datetime string and return a formatted string
3. THE Utility SHALL format dates in the pattern "MMM DD, YYYY" (e.g., "Feb 03, 2026")
4. THE ChannelDetail Component SHALL import and use the shared date formatting utility
5. THE Utility SHALL handle null or undefined date values gracefully by returning a fallback string

### Requirement 4: Implement Loading State

**User Story:** As a user, I want to see a loading indicator while ebooks are being fetched, so that I know the application is working and data is being retrieved.

#### Acceptance Criteria

1. WHEN the ChannelDetail component begins fetching ebooks, THE Component SHALL display a loading indicator
2. WHILE data is being fetched, THE Component SHALL prevent rendering of ebook cards
3. WHEN the data fetch completes, THE Component SHALL hide the loading indicator and display the results
4. THE Loading Indicator SHALL use Tailwind CSS classes for styling consistency

### Requirement 5: Implement Error State

**User Story:** As a user, I want to see a clear error message if ebook fetching fails, so that I understand what went wrong and can take appropriate action.

#### Acceptance Criteria

1. WHEN the ebook data fetch fails, THE Component SHALL display an error message to the user
2. THE Error Message SHALL be user-friendly and explain that ebooks could not be loaded
3. WHEN an error occurs, THE Component SHALL log the error details to the console for debugging
4. THE Error State SHALL use Tailwind CSS classes for styling consistency
5. WHEN displaying an error, THE Component SHALL still show the header and navigation elements

### Requirement 6: Use Consistent Tailwind Styling

**User Story:** As a developer, I want the component to use Tailwind CSS classes consistently, so that styling is maintainable and follows the project's design system.

#### Acceptance Criteria

1. THE Component SHALL use Tailwind CSS utility classes for all styling
2. THE Component SHALL NOT mix inline Tailwind classes with custom CSS classes unless necessary
3. THE Component SHALL maintain the existing visual design while using Tailwind classes
4. THE Component SHALL use consistent spacing, colors, and typography utilities from Tailwind

### Requirement 7: Maintain Existing Functionality

**User Story:** As a user, I want all existing features to continue working after the refactor, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN I click the back button, THE Component SHALL navigate to the channel list page
2. WHEN ebooks are displayed, THE Component SHALL show the title, page count, and generation date
3. WHEN ebooks have source videos, THE Component SHALL display them as clickable links
4. WHEN I click a download button, THE Component SHALL initiate a PDF download using the pdfUrl
5. WHEN no ebooks exist for a channel, THE Component SHALL display an empty state message
6. THE Component SHALL decode the channel URL from the route parameter correctly

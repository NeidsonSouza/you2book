# Requirements Document

## Introduction

This specification covers a comprehensive refactoring of the You2Book codebase to improve maintainability, debuggability, and code quality. The refactoring preserves all existing business logic while restructuring code for clarity, consistency, and long-term scalability. Key areas include breaking down the monolithic Lambda handler, standardizing error handling patterns, improving logging, adding utility tests, and cleaning up frontend components.

## Glossary

- **Handler**: The `fetch-channel-videos` Lambda function entry point that orchestrates YouTube data fetching and database operations
- **Frontend_Service**: A TypeScript module in `src/services/` that encapsulates Amplify data client operations for a specific domain (channels, YouTube)
- **Utility_Module**: A TypeScript module in `src/lib/` containing pure helper functions (formatting, parsing)
- **Agent_Invoker**: The Python Lambda function that invokes the Bedrock AgentCore runtime
- **Agentcore_Server**: The FastAPI-based Strands Agent server deployed to Bedrock AgentCore
- **Cascade_Delete**: The process of deleting a channel and all its associated videos, ebooks, and ebook-video join records
- **SRT_Parser**: The function that strips SRT formatting (sequence numbers, timestamps, HTML tags) from caption content to produce plain text
- **Channel_URL_Parser**: The function that extracts a YouTube channel identifier from various URL formats

## Requirements

### Requirement 1: Break Down the Monolithic Lambda Handler

**User Story:** As a developer, I want the `fetch-channel-videos` handler to be organized into focused modules, so that each concern is independently readable, testable, and maintainable.

#### Acceptance Criteria

1. WHEN the Handler source is organized, THE Handler SHALL separate YouTube API interaction functions, database operation functions, transcript processing functions, and URL parsing functions into distinct modules
2. WHEN the Handler is invoked, THE Handler SHALL delegate to the same focused functions as before, preserving identical input/output behavior
3. WHEN a module is imported, THE module SHALL export only the public functions needed by the handler orchestration layer
4. THE SRT_Parser SHALL be extracted into its own module with a dedicated export

### Requirement 2: Standardize Error Handling in the Lambda Handler

**User Story:** As a developer, I want consistent, structured error handling across the Lambda handler, so that failures are easy to diagnose and never silently swallowed.

#### Acceptance Criteria

1. WHEN a YouTube API call fails, THE Handler SHALL wrap the error with contextual metadata including the operation name, the channel or video identifier, and the HTTP status code when available
2. WHEN a database operation fails, THE Handler SHALL wrap the error with the operation type, the entity identifier, and the original error message
3. WHEN an error is caught at any level, THE Handler SHALL log the error with structured fields before re-throwing or returning a failure response
4. IF an unexpected error occurs in the top-level handler, THEN THE Handler SHALL return a structured failure response with a correlation identifier for tracing

### Requirement 3: Standardize Error Handling in Frontend Services

**User Story:** As a developer, I want frontend service functions to handle and report errors consistently, so that UI components receive predictable error information.

#### Acceptance Criteria

1. WHEN an Amplify data client operation returns errors, THE Frontend_Service SHALL throw an error that includes the operation name and the concatenated error messages
2. WHEN the Cascade_Delete encounters partial failures, THE Frontend_Service SHALL collect all individual errors and throw a single summary error after attempting all deletions
3. WHEN a Frontend_Service function catches an error, THE Frontend_Service SHALL log the error to the console with the function name and relevant entity identifiers before re-throwing

### Requirement 4: Improve Logging in the Lambda Handler

**User Story:** As a developer, I want structured, meaningful logs in the Lambda handler, so that I can trace execution flow and diagnose issues in production.

#### Acceptance Criteria

1. THE Handler SHALL log each major orchestration step (URL parsing, metadata fetch, video fetch, channel upsert, video save) with a consistent structured format including a correlation identifier
2. WHEN a batch operation completes, THE Handler SHALL log a summary with counts of successful, skipped, and failed items
3. WHEN an external API call is made, THE Handler SHALL log the request parameters and response status
4. THE Handler SHALL avoid logging sensitive data such as full API keys or user tokens

### Requirement 5: Improve Logging in the Agent Invoker

**User Story:** As a developer, I want the Agent Invoker Lambda to have clear, structured logs, so that I can trace agent invocations and diagnose failures.

#### Acceptance Criteria

1. WHEN the Agent_Invoker receives a request, THE Agent_Invoker SHALL log the session identifier, prompt length, and invocation start time
2. WHEN the Agent_Invoker receives a response from AgentCore, THE Agent_Invoker SHALL log the response content type, HTTP status, and response length
3. IF the Agent_Invoker encounters an error, THEN THE Agent_Invoker SHALL log the error type, error message, and the runtime ARN without logging the full prompt content
4. THE Agent_Invoker SHALL avoid logging the full prompt text or full response body to prevent excessive log volume

### Requirement 6: Add Tests for Pure Utility Functions

**User Story:** As a developer, I want the pure utility functions to have comprehensive tests, so that formatting and parsing logic is verified and regressions are caught.

#### Acceptance Criteria

1. THE Utility_Module `formatDate` function SHALL have tests covering valid Date objects, valid ISO strings, null input, undefined input, and invalid date strings
2. THE Utility_Module `formatDuration` function SHALL have tests covering durations with hours-minutes-seconds, minutes-seconds only, seconds only, null input, undefined input, and non-matching strings
3. THE SRT_Parser SHALL have tests verifying that sequence numbers, timestamp lines, and HTML tags are removed while text content is preserved
4. THE Channel_URL_Parser SHALL have tests covering `/channel/{ID}`, `/@{handle}`, `/c/{custom}`, `/user/{username}` formats, and invalid URLs
5. FOR ALL valid SRT content strings, parsing then joining the result lines SHALL produce output that contains no timestamp patterns and no sequence-number-only lines (round-trip cleanliness property)
6. FOR ALL valid YouTube channel URLs in any supported format, extracting the channel identifier SHALL produce a non-empty string

### Requirement 7: Remove Dead Code and Duplication

**User Story:** As a developer, I want unused code and duplicated logic removed, so that the codebase is lean and each piece of logic exists in exactly one place.

#### Acceptance Criteria

1. WHEN the `youtubeService.ts` module contains functions that duplicate logic already handled by the Lambda handler, THE refactoring SHALL remove the duplicated frontend functions and update any callers
2. WHEN the `youtubeService.ts` `extractChannelNameFromUrl` function is not used by any component, THE refactoring SHALL remove the function
3. WHEN the `youtubeService.ts` `saveVideosToDatabase` function duplicates the Lambda handler's video saving logic, THE refactoring SHALL remove the function and update any callers

### Requirement 8: Improve Frontend Component Structure

**User Story:** As a developer, I want frontend components to follow consistent patterns for data fetching, loading states, and error display, so that the UI layer is predictable and easy to extend.

#### Acceptance Criteria

1. WHEN a component fetches data, THE component SHALL use a custom hook that encapsulates the data fetching, loading state, and error state
2. WHEN a component displays an error, THE component SHALL render the error in a consistent format with an appropriate ARIA role for accessibility
3. WHEN a component displays a loading state, THE component SHALL render a consistent loading indicator

### Requirement 9: Improve Agentcore Server Error Handling and Logging

**User Story:** As a developer, I want the Agentcore FastAPI server to have structured logging and robust error handling, so that agent processing issues are traceable.

#### Acceptance Criteria

1. WHEN the Agentcore_Server receives an invocation request, THE Agentcore_Server SHALL log the request with a timestamp and prompt length
2. WHEN the Agentcore_Server completes processing, THE Agentcore_Server SHALL log the response timestamp and response message length
3. IF the Agentcore_Server encounters a processing error, THEN THE Agentcore_Server SHALL log the error type and message with structured fields before returning an HTTP 500 response
4. THE Agentcore_Server SHALL use Python's standard logging module with a consistent format instead of relying on print statements or bare exception messages

### Requirement 10: Improve Naming and Code Clarity

**User Story:** As a developer, I want variables, functions, and modules to have clear, descriptive names, so that the code is self-documenting and easy to navigate.

#### Acceptance Criteria

1. WHEN a function performs a specific operation, THE function name SHALL clearly describe the operation using a verb-noun pattern (e.g., `fetchChannelMetadata` instead of `getChannel`)
2. WHEN a variable holds a specific value, THE variable name SHALL describe the content rather than the type (e.g., `channelName` instead of `result`)
3. WHEN inline comments are present, THE comments SHALL explain the "why" behind non-obvious logic rather than restating what the code does

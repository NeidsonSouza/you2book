# Implementation Plan: Codebase Refactoring

## Overview

Refactor the You2Book codebase for improved maintainability, debuggability, and code quality. The work proceeds in layers: extract Lambda handler modules first (highest complexity), then add tests for pure functions, clean up frontend code, and finally improve the Python layer. Each step preserves existing behavior.

## Tasks

- [x] 1. Extract pure utility modules from the Lambda handler
  - [x] 1.1 Create `amplify/functions/fetch-channel-videos/srt-parser.ts` — move `stripSrtTimestamps` function and its logic out of `handler.ts`, export it as the sole public function
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 Create `amplify/functions/fetch-channel-videos/url-parser.ts` — move `extractChannelId` function out of `handler.ts`, export it
    - _Requirements: 1.1, 1.3_
  - [x] 1.3 Update `handler.ts` to import `stripSrtTimestamps` from `srt-parser.ts` and `extractChannelId` from `url-parser.ts`, remove the inlined versions
    - _Requirements: 1.2, 1.3_

- [x] 2. Add tests for extracted pure functions
  - [x] 2.1 Create `amplify/functions/fetch-channel-videos/srt-parser.test.ts` — unit tests for `stripSrtTimestamps` covering: standard SRT input, empty input, input with only timestamps, input with HTML tags, input with no SRT formatting
    - _Requirements: 6.3_
  - [ ]* 2.2 Add property test for SRT parser output cleanliness in `srt-parser.test.ts`
    - **Property 1: SRT parser output cleanliness**
    - **Validates: Requirements 6.5**
  - [x] 2.3 Create `amplify/functions/fetch-channel-videos/url-parser.test.ts` — unit tests for `extractChannelId` covering: `/channel/{ID}`, `/@{handle}`, `/c/{custom}`, `/user/{username}` formats, invalid URLs, non-YouTube URLs
    - _Requirements: 6.4_
  - [ ]* 2.4 Add property test for channel URL parser in `url-parser.test.ts`
    - **Property 2: Channel URL parser produces non-empty identifiers**
    - **Validates: Requirements 6.6**

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extract remaining Lambda handler modules
  - [x] 4.1 Create `amplify/functions/fetch-channel-videos/youtube-api.ts` — move `fetchChannelMetadata`, `fetchAllVideos`, `fetchTranscript`, `selectCaptionTrack`, and related interfaces (`YouTubeVideo`, `CaptionTrack`) out of `handler.ts`
    - _Requirements: 1.1, 1.3_
  - [x] 4.2 Create `amplify/functions/fetch-channel-videos/transcript.ts` — move `processTranscript`, `uploadTranscriptToS3`, `buildTranscriptKey` out of `handler.ts`, import `fetchTranscript` from `youtube-api.ts` and `stripSrtTimestamps` from `srt-parser.ts`
    - _Requirements: 1.1, 1.3_
  - [x] 4.3 Create `amplify/functions/fetch-channel-videos/database.ts` — move `upsertChannel`, `saveVideos`, and related interfaces (`TranscriptStats`, `SaveVideosResult`) out of `handler.ts`, accept the Amplify client as a parameter
    - _Requirements: 1.1, 1.3_
  - [x] 4.4 Refactor `handler.ts` to be orchestration-only — import from all extracted modules, keep only the `handler` export, `getYouTubeApiKey`, `getTranscriptBucketName`, and Amplify client initialization
    - _Requirements: 1.2, 1.3_

- [x] 5. Add structured logging to the Lambda handler
  - [x] 5.1 Add a correlation ID (using `crypto.randomUUID()`) at the start of the handler, pass it through to log statements
    - _Requirements: 2.4, 4.1_
  - [x] 5.2 Update all `console.log` and `console.error` calls in `handler.ts` and extracted modules to use `JSON.stringify` with structured fields: `correlationId`, `step`, entity identifiers, and `status`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 5.3 Update error handling in each module to include operation name and entity identifiers in error messages
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.4 Ensure no log statement includes the full API key value — log only a masked version or omit it entirely
    - _Requirements: 4.4_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add tests for frontend utility functions
  - [x] 7.1 Create `src/lib/utils.test.ts` — unit tests for `formatDate` covering: valid Date object, valid ISO string, null, undefined, invalid string
    - _Requirements: 6.1_
  - [x] 7.2 Add unit tests for `formatDuration` in `src/lib/utils.test.ts` covering: hours+minutes+seconds, minutes+seconds, seconds only, null, undefined, non-matching string
    - _Requirements: 6.2_

- [x] 8. Remove dead code and duplication from frontend services
  - [x] 8.1 Remove `saveVideosToDatabase` from `src/services/youtubeService.ts` — this duplicates the Lambda handler's video saving logic
    - _Requirements: 7.3_
  - [x] 8.2 Remove `extractChannelNameFromUrl` from `src/services/youtubeService.ts` — this function is unused
    - _Requirements: 7.2_
  - [x] 8.3 Update any imports or callers affected by the removals; if `youtubeService.ts` only has `fetchVideosFromYouTube` left, keep it as a thin service wrapper
    - _Requirements: 7.1_

- [x] 9. Standardize frontend error handling
  - [x] 9.1 Update `src/services/channelService.ts` — add function name prefix to all error messages and console.error calls, include entity identifiers in log metadata
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 9.2 Update `src/services/youtubeService.ts` — add function name prefix to error messages and console.error calls
    - _Requirements: 3.1, 3.3_
  - [x] 9.3 Ensure `src/ChannelDetail.tsx` error display uses `role="alert"` consistently (already present, verify)
    - _Requirements: 8.2_

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Improve Python layer logging and error handling
  - [x] 11.1 Update `amplify/functions/agent-invoker/index.py` — avoid logging full event payload, log only metadata (session ID, prompt length, function ARN); ensure error logs include error type name and runtime ARN without full prompt
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 11.2 Update `agentcore/src/main.py` — add Python `logging` module with consistent format, log request metadata (prompt length, timestamp) on invocation, log response metadata (message length, timestamp) on completion, add structured error logging in exception handler
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Improve naming and inline documentation
  - [x] 12.1 Review and improve variable names across extracted Lambda modules — ensure variables describe content not type (e.g., rename generic `result` variables to descriptive names like `channelRecord`, `videoCreateResult`)
    - _Requirements: 10.2_
  - [x] 12.2 Review inline comments across all modified files — remove comments that restate code, add comments explaining non-obvious "why" decisions
    - _Requirements: 10.3_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases using Vitest
- All test files are co-located with source files using `.test.ts` suffix

# Implementation Plan: Migrate Transcript to Python Lambda

## Overview

Incrementally build the new Python Lambda, wire it into the Amplify backend, update the TS Lambda to invoke it, then clean up legacy code. Each step builds on the previous and ends with wiring into the existing system.

## Tasks

- [ ] 1. Create the Python Lambda function
  - [ ] 1.1 Create `amplify/functions/save-transcript/index.py` with the handler
    - Implement `handler(event, context)` that parses the invocation payload
    - Validate required fields (`videoYoutubeIds`, `owner`, `channelId`, `bucketName`)
    - For each video ID: fetch transcript via `youtube-transcript-api`, concatenate segments, build S3 key (`transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`), upload to S3 with `text/plain; charset=utf-8`
    - Return `{results: [{videoYoutubeId, success, transcriptKey?, error?}, ...]}` 
    - Handle per-video errors (TranscriptsDisabled, NoTranscriptFound, S3 failures) without stopping the batch
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2_
  - [ ] 1.2 Create `amplify/functions/save-transcript/requirements.txt`
    - Add `youtube-transcript-api` dependency
    - _Requirements: 4.5_
  - [ ] 1.3 Create `amplify/functions/save-transcript/resource.ts`
    - Define CDK `Function` construct following the `agent-invoker` pattern
    - Use `Runtime.PYTHON_3_12`, timeout 120s, memory 256MB
    - Local bundling: pip install requirements.txt, copy *.py files
    - _Requirements: 4.1, 4.5_

- [ ] 2. Wire Python Lambda into Amplify backend
  - [ ] 2.1 Update `amplify/backend.ts`
    - Import and register `saveTranscript` in `defineBackend`
    - Grant `storageBucket.grantWrite(saveTranscriptLambda, 'transcripts/*')`
    - Grant `fetchLambda` invoke permission on `saveTranscriptLambda`
    - Add `SAVE_TRANSCRIPT_FUNCTION_NAME` env var to `fetchLambda`
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 3. Checkpoint
  - Ensure the Python Lambda and backend wiring compile without errors. Ask the user if questions arise.

- [ ] 4. Update TS Lambda to invoke Python Lambda
  - [ ] 4.1 Create `amplify/functions/fetch-channel-videos/transcript-invoker.ts`
    - Implement `invokeTranscriptLambda(params)` using `@aws-sdk/client-lambda` `InvokeCommand` with `RequestResponse` invocation type
    - Parse response payload, handle `FunctionError`, invalid JSON, and invocation failures
    - Return `TranscriptResult[]` (or all-failed array on invocation error)
    - _Requirements: 3.1, 3.3_
  - [ ] 4.2 Update `amplify/functions/fetch-channel-videos/database.ts`
    - Replace inline `processTranscript()` calls with a single batch call to `invokeTranscriptLambda`
    - After creating new Video records, collect their YouTube IDs and invoke the Python Lambda once
    - Iterate over results: update DynamoDB with `transcriptKey` and `transcriptAvailable: true` for successful videos
    - Handle missing `SAVE_TRANSCRIPT_FUNCTION_NAME` env var gracefully (skip transcripts, log warning)
    - Remove import of `processTranscript` from `transcript.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.4_
  - [ ]* 4.3 Write property test for S3 key format (Property 3)
    - **Property 3: S3 key format consistency**
    - Generate random `owner`, `channelId`, `videoYoutubeId` strings with fast-check
    - Verify the key equals `transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`
    - **Validates: Requirements 1.3, 6.1**
  - [ ]* 4.4 Write property test for DB update correctness (Property 5)
    - **Property 5: DB updates match successful transcript results**
    - Generate random `TranscriptResult[]` arrays with mixed success/failure via fast-check
    - Mock DynamoDB update calls, run the update logic
    - Verify updates are called only for successful results with correct `transcriptKey` and `transcriptAvailable: true`
    - **Validates: Requirements 3.2**
  - [ ]* 4.5 Write property test for invocation payload construction (Property 6)
    - **Property 6: Invocation payload contains exactly new video IDs**
    - Generate random arrays of video YouTube IDs via fast-check
    - Verify the constructed payload contains exactly those IDs with correct metadata
    - **Validates: Requirements 3.4**

- [ ] 5. Checkpoint
  - Ensure all TypeScript compiles and tests pass. Ask the user if questions arise.

- [ ] 6. Clean up legacy transcript code
  - [ ] 6.1 Delete `amplify/functions/fetch-channel-videos/transcript.ts`
    - _Requirements: 5.1_
  - [ ] 6.2 Delete `amplify/functions/fetch-channel-videos/srt-parser.ts`
    - _Requirements: 5.2_
  - [ ] 6.3 Remove `fetchTranscript` and `downloadCaptionTrack` from `amplify/functions/fetch-channel-videos/youtube-api.ts`
    - Keep `fetchChannelMetadata` and `fetchAllVideos` intact
    - Remove related types (`CaptionTrackInfo`, `CaptionsData`) if no longer used
    - _Requirements: 5.3_
  - [ ] 6.4 Remove unused imports and references across the TS Lambda
    - Clean up any remaining references to removed modules in `handler.ts`, `database.ts`, and `resource.ts`
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7. Final checkpoint
  - Ensure all tests pass and the project builds cleanly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Python-side property tests (Properties 1, 2, 4 from design) can be added later if pytest + hypothesis are set up in the project

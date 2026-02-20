# Implementation Plan: Video Transcription Storage

## Overview

Extend the existing video import pipeline to fetch YouTube captions and store them as plain text in S3. Changes touch the Amplify data schema, storage config, backend wiring, and the `fetch-channel-videos` Lambda handler. All new logic is TypeScript, co-located with the existing Lambda code.

## Tasks

- [ ] 1. Extend Video model and storage configuration
  - [x] 1.1 Add `transcriptKey` (optional string) and `transcriptAvailable` (boolean, default false) fields to the Video model in `amplify/data/resource.ts`
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 1.2 Add `transcripts/{entity_id}/*` path with read-only access for `entity('identity')` to the existing storage definition in `amplify/storage/resource.ts`
    - _Requirements: 4.1, 4.2, 4.4_
  - [ ] 1.3 In `amplify/backend.ts`, grant the `fetch-channel-videos` Lambda write access to the storage bucket for `transcripts/*` and pass the bucket name as an environment variable `TRANSCRIPT_BUCKET_NAME`
    - _Requirements: 4.3_

- [ ] 2. Implement SRT parsing and transcript key utilities
  - [ ] 2.1 Create `stripSrtTimestamps` pure function in `amplify/functions/fetch-channel-videos/handler.ts` that removes SRT sequence numbers, timestamp lines, and HTML tags from caption content, returning clean plain text
    - _Requirements: 2.2, 3.3_
  - [ ] 2.2 Create `selectCaptionTrack` function that takes an array of caption track objects and returns the preferred track (English preferred, fallback to first available), or null if empty
    - _Requirements: 2.3_
  - [ ] 2.3 Create `buildTranscriptKey` function that generates the S3 key in format `transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`
    - _Requirements: 3.1_
  - [ ]* 2.4 Write property test: SRT stripping produces clean plain text
    - **Property 1: SRT stripping produces clean plain text**
    - Generate random SRT-formatted strings with timestamps, sequence numbers, and HTML tags. Verify output contains none of these patterns.
    - **Validates: Requirements 2.2, 3.3**
  - [ ]* 2.5 Write property test: English track preference
    - **Property 2: English track preference**
    - Generate random arrays of caption track objects including at least one English track. Verify the selected track is English.
    - **Validates: Requirements 2.3**
  - [ ]* 2.6 Write property test: S3 key format correctness
    - **Property 3: S3 key format correctness**
    - Generate random non-empty strings for owner, channel, and video IDs. Verify the key matches the expected pattern.
    - **Validates: Requirements 3.1**

- [ ] 3. Checkpoint — Verify pure functions and property tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement transcript fetching and S3 upload
  - [ ] 4.1 Create `fetchTranscript` function that calls YouTube `captions.list` and `captions.download` for a video, selects the best track using `selectCaptionTrack`, downloads SRT content, and returns plain text via `stripSrtTimestamps`. Returns `null` if no captions or on error. Include logging for caption list request, selected language, and character count.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2_
  - [ ] 4.2 Create `uploadTranscriptToS3` function using `@aws-sdk/client-s3` `PutObjectCommand` to upload plain text content with `ContentType: 'text/plain; charset=utf-8'`. Use a module-level `S3Client` singleton. Include logging for S3 key and result.
    - _Requirements: 3.1, 3.3, 6.3_
  - [ ] 4.3 Create `processTranscript` orchestrator function that calls `fetchTranscript`, builds the S3 key via `buildTranscriptKey`, calls `uploadTranscriptToS3`, and returns `{ success: boolean, key?: string }`. Catch and log all errors per video.
    - _Requirements: 3.1, 3.2, 3.4, 5.3, 6.4_
  - [ ]* 4.4 Write unit tests for `fetchTranscript` with mocked YouTube API (no tracks, error response, valid SRT response)
    - _Requirements: 2.1, 2.4, 2.5_
  - [ ]* 4.5 Write unit tests for `uploadTranscriptToS3` with mocked S3 client (success and failure cases)
    - _Requirements: 3.1, 3.4_

- [ ] 5. Integrate transcript processing into video import flow
  - [ ] 5.1 Modify `saveVideos` function to accept `apiKey` and `bucketName` parameters, call `processTranscript` after creating each new video, update the video record with `transcriptKey` and `transcriptAvailable` on success, and track `TranscriptStats` (successful, failed, skipped). Skip transcript fetching for duplicate videos. Log summary at end.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.5_
  - [ ] 5.2 Update the main `handler` function to pass `apiKey` and `TRANSCRIPT_BUCKET_NAME` env var to `saveVideos`, and include transcript stats in the response message
    - _Requirements: 5.4_
  - [ ]* 5.3 Write property test: Transcript stats invariant
    - **Property 4: Transcript stats invariant**
    - Generate arrays of video processing outcomes. Verify successful + failed + skipped equals total input count.
    - **Validates: Requirements 5.3, 5.4**
  - [ ]* 5.4 Write unit tests for the integrated `saveVideos` flow with mocked YouTube API and S3 (verify transcript stats accumulation, duplicate skipping, error resilience)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

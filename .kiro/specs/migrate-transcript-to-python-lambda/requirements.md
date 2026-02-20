# Requirements Document

## Introduction

Migrate the "save video transcript" functionality from the existing TypeScript `fetch-channel-videos` Lambda to a new dedicated Python Lambda function (`save-transcript`). The Python Lambda leverages the `youtube-transcript-api` library for more reliable transcript fetching. The TypeScript Lambda invokes the Python Lambda synchronously, receives per-video results, and updates DynamoDB accordingly.

## Glossary

- **TS_Lambda**: The existing TypeScript Lambda function `fetch-channel-videos` that orchestrates YouTube channel fetching, video saving, and transcript processing.
- **Python_Lambda**: The new Python Lambda function `save-transcript` that fetches transcripts using `youtube-transcript-api` and uploads them to S3.
- **Transcript**: Plain text content extracted from a YouTube video's captions.
- **S3_Key**: The object key used to store a transcript in S3, following the format `transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`.
- **Invocation_Payload**: The JSON request body sent from TS_Lambda to Python_Lambda containing video IDs and metadata needed for transcript processing.
- **Invocation_Response**: The JSON response body returned from Python_Lambda to TS_Lambda containing per-video success/failure results.
- **Storage_Bucket**: The S3 bucket defined by Amplify storage for storing video transcripts.

## Requirements

### Requirement 1: Python Lambda Transcript Fetching

**User Story:** As a system operator, I want transcripts fetched using Python's `youtube-transcript-api` library, so that transcript retrieval is more reliable than the current TypeScript implementation.

#### Acceptance Criteria

1. WHEN the Python_Lambda receives an Invocation_Payload with a list of video YouTube IDs, THE Python_Lambda SHALL fetch the transcript for each video using the `youtube-transcript-api` library
2. WHEN the `youtube-transcript-api` returns transcript segments for a video, THE Python_Lambda SHALL concatenate the segment texts into a single plain-text Transcript
3. WHEN a transcript is successfully fetched for a video, THE Python_Lambda SHALL upload the Transcript to the Storage_Bucket using the S3_Key format `transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`
4. THE Python_Lambda SHALL accept an Invocation_Payload containing the fields: `videoYoutubeIds` (list of strings), `owner` (string), `channelId` (string), and `bucketName` (string)
5. THE Python_Lambda SHALL return an Invocation_Response containing a `results` list where each entry includes `videoYoutubeId`, `success` (boolean), and an optional `transcriptKey` (string)

### Requirement 2: Batch Processing and Partial Failure Handling

**User Story:** As a system operator, I want the Python Lambda to process a batch of videos in a single invocation and handle individual failures gracefully, so that one failed transcript does not block the others.

#### Acceptance Criteria

1. WHEN the Python_Lambda processes a batch of video YouTube IDs, THE Python_Lambda SHALL attempt to fetch and upload a transcript for each video independently
2. IF a transcript fetch fails for a specific video, THEN THE Python_Lambda SHALL record that video as failed in the Invocation_Response and continue processing the remaining videos
3. IF an S3 upload fails for a specific video, THEN THE Python_Lambda SHALL record that video as failed in the Invocation_Response and continue processing the remaining videos
4. WHEN all videos in the batch have been processed, THE Python_Lambda SHALL return an Invocation_Response with the result for every video in the input list

### Requirement 3: TypeScript Lambda Integration

**User Story:** As a system operator, I want the TypeScript Lambda to invoke the new Python Lambda synchronously and use its results to update DynamoDB, so that the transcript flow is seamlessly migrated without changing the external behavior.

#### Acceptance Criteria

1. WHEN the TS_Lambda has new videos to process for transcripts, THE TS_Lambda SHALL invoke the Python_Lambda synchronously using AWS Lambda `RequestResponse` invocation with the batch of video YouTube IDs
2. WHEN the TS_Lambda receives the Invocation_Response from the Python_Lambda, THE TS_Lambda SHALL update each Video record in DynamoDB: setting `transcriptKey` and `transcriptAvailable` to true for successful videos
3. IF the Python_Lambda invocation itself fails (e.g., timeout, crash), THEN THE TS_Lambda SHALL log the error and mark all videos in the batch as transcript-failed without crashing the overall channel fetch flow
4. WHEN the TS_Lambda invokes the Python_Lambda, THE TS_Lambda SHALL pass the `owner`, `channelId`, `bucketName`, and the list of `videoYoutubeIds` for new (non-duplicate) videos only

### Requirement 4: Infrastructure and Permissions

**User Story:** As a developer, I want the new Python Lambda properly wired into the Amplify backend with correct IAM permissions, so that it can write to S3 and be invoked by the TypeScript Lambda.

#### Acceptance Criteria

1. THE Python_Lambda SHALL be defined at `amplify/functions/save-transcript/` using the same CDK `Function` construct pattern as the existing `agent-invoker` Lambda
2. THE Python_Lambda SHALL have write permission to the Storage_Bucket scoped to the `transcripts/*` prefix
3. THE TS_Lambda SHALL have `lambda:InvokeFunction` permission on the Python_Lambda
4. THE TS_Lambda SHALL receive the Python_Lambda function name as an environment variable
5. THE Python_Lambda SHALL use Python 3.12 runtime and bundle the `youtube-transcript-api` and `boto3` dependencies via local pip install

### Requirement 5: Cleanup of Legacy Transcript Code

**User Story:** As a developer, I want the old TypeScript transcript-fetching code removed from the `fetch-channel-videos` Lambda, so that the codebase has a single source of truth for transcript processing.

#### Acceptance Criteria

1. WHEN the migration is complete, THE TS_Lambda codebase SHALL no longer contain the `transcript.ts` module (including `processTranscript`, `buildTranscriptKey`, and `uploadTranscriptToS3`)
2. WHEN the migration is complete, THE TS_Lambda codebase SHALL no longer contain the `srt-parser.ts` module (including `stripSrtTimestamps`)
3. WHEN the migration is complete, THE `youtube-api.ts` module SHALL no longer contain the `fetchTranscript` and `downloadCaptionTrack` functions while retaining `fetchChannelMetadata` and `fetchAllVideos`
4. WHEN the migration is complete, THE `database.ts` module SHALL invoke the Python_Lambda for transcript processing instead of calling the removed `processTranscript` function

### Requirement 6: S3 Key Format Compatibility

**User Story:** As a system operator, I want the new Python Lambda to produce transcripts with the same S3 key format as the old implementation, so that existing transcripts and downstream consumers remain compatible.

#### Acceptance Criteria

1. THE Python_Lambda SHALL store transcripts using the S3_Key format `transcripts/{owner}/{channelId}/{videoYoutubeId}.txt`
2. THE Python_Lambda SHALL upload transcripts with content type `text/plain; charset=utf-8`

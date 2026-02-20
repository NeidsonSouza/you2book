# Requirements Document

## Introduction

This feature adds automatic YouTube video transcription fetching and storage to You2Book. When videos are imported via the `fetch-channel-videos` Lambda, the system fetches available captions from the YouTube Data API, extracts plain text content, and stores the transcriptions as `.txt` files in S3. The Video model is extended with fields to track transcript availability and S3 location. S3 access is configured so that the Lambda can write transcripts and authenticated users can only read their own.

## Glossary

- **Fetch_Lambda**: The existing `fetch-channel-videos` AWS Lambda function that fetches YouTube channel data and saves video records to DynamoDB.
- **Transcript_Storage**: The S3 storage path `transcripts/{entity_id}/*` within the Amplify-managed storage bucket where transcription text files are stored.
- **Video_Model**: The DynamoDB-backed Amplify data model representing a YouTube video, defined in `amplify/data/resource.ts`.
- **Captions_API**: The YouTube Data API v3 captions endpoints used to list and retrieve subtitle tracks for a video.
- **Transcript_File**: A plain text file (`.txt`) containing only the transcript content of a YouTube video, with no timestamps or metadata.
- **Owner_ID**: The Cognito identity ID (`entity_id`) used by Amplify to scope S3 paths per authenticated user.

## Requirements

### Requirement 1: Extend Video Model with Transcript Fields

**User Story:** As a developer, I want the Video data model to track transcript availability and S3 location, so that the frontend can determine whether a transcript exists without querying S3.

#### Acceptance Criteria

1. THE Video_Model SHALL include an optional `transcriptKey` field of type string
2. THE Video_Model SHALL include a `transcriptAvailable` boolean field that defaults to `false`
3. WHEN a video record is created without transcript data, THE Video_Model SHALL store `transcriptAvailable` as `false` and `transcriptKey` as null

### Requirement 2: Fetch Captions from YouTube API

**User Story:** As a user, I want video transcriptions fetched automatically when I import a channel, so that I do not need to manually retrieve them.

#### Acceptance Criteria

1. WHEN the Fetch_Lambda processes a video, THE Fetch_Lambda SHALL call the Captions_API to list available caption tracks for that video
2. WHEN caption tracks are available, THE Fetch_Lambda SHALL download the caption content and extract plain text without timestamps or metadata
3. WHEN multiple caption tracks exist, THE Fetch_Lambda SHALL prefer the English-language track
4. IF the Captions_API returns no caption tracks for a video, THEN THE Fetch_Lambda SHALL set `transcriptAvailable` to `false` on the video record and skip transcript storage
5. IF the Captions_API call fails for a video, THEN THE Fetch_Lambda SHALL log the error, set `transcriptAvailable` to `false`, and continue processing remaining videos

### Requirement 3: Store Transcriptions in S3

**User Story:** As a user, I want my video transcriptions stored as plain text files in S3, so that they can be retrieved and used for ebook generation.

#### Acceptance Criteria

1. WHEN a transcript is successfully fetched, THE Fetch_Lambda SHALL upload the plain text content to Transcript_Storage at the key `transcripts/{owner_id}/{channel_id}/{video_youtube_id}.txt`
2. WHEN a transcript file is stored, THE Fetch_Lambda SHALL update the video record with `transcriptKey` set to the S3 key and `transcriptAvailable` set to `true`
3. THE Transcript_File SHALL contain only plain text transcript content with no timestamps, formatting markup, or metadata
4. IF the S3 upload fails, THEN THE Fetch_Lambda SHALL log the error, set `transcriptAvailable` to `false` on the video record, and continue processing remaining videos

### Requirement 4: Configure S3 Access Permissions in Existing Storage Resource

**User Story:** As a system administrator, I want proper access controls on the transcript storage bucket, so that users can only read their own transcripts and only the Lambda can write them.

#### Acceptance Criteria

1. THE Transcript_Storage configuration SHALL be added to the existing storage definition in `amplify/storage/resource.ts` as a new path entry alongside the existing `profile-pictures` and `picture-submissions` paths
2. THE Transcript_Storage SHALL grant authenticated users read-only access scoped to their own Owner_ID path prefix (`transcripts/{entity_id}/*`)
3. THE Fetch_Lambda SHALL have write access to the Transcript_Storage for all user paths
4. THE Transcript_Storage SHALL prevent authenticated users from writing or deleting Transcript_Files directly

### Requirement 5: Integrate Transcription Fetching into Video Import Flow

**User Story:** As a user, I want transcription fetching to be seamless and non-blocking, so that video import completes even if some transcriptions fail.

#### Acceptance Criteria

1. WHEN the Fetch_Lambda saves a new video to the database, THE Fetch_Lambda SHALL attempt to fetch and store the transcript for that video
2. WHEN the Fetch_Lambda encounters an existing (duplicate) video during import, THE Fetch_Lambda SHALL skip transcript fetching for that video
3. IF any individual transcript fetch or upload fails, THEN THE Fetch_Lambda SHALL continue processing the remaining videos without interruption
4. WHEN all videos are processed, THE Fetch_Lambda SHALL include transcript fetch statistics (successful, failed, skipped) in the response message

### Requirement 6: Logging for Debugging

**User Story:** As a developer, I want detailed logging throughout the transcription flow, so that I can diagnose issues in production.

#### Acceptance Criteria

1. WHEN the Fetch_Lambda begins fetching captions for a video, THE Fetch_Lambda SHALL log the video YouTube ID and the caption list request
2. WHEN the Fetch_Lambda successfully downloads a caption track, THE Fetch_Lambda SHALL log the video YouTube ID, selected language, and transcript character count
3. WHEN the Fetch_Lambda uploads a transcript to S3, THE Fetch_Lambda SHALL log the S3 key and upload result
4. IF a caption fetch or S3 upload fails, THEN THE Fetch_Lambda SHALL log the video YouTube ID, the operation that failed, and the error message
5. WHEN all transcript processing completes for a channel import, THE Fetch_Lambda SHALL log a summary with counts of successful, failed, and skipped transcripts

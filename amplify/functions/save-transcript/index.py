import json
import logging
import boto3
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from typing import Any, Dict, List

# Configure logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler that fetches YouTube transcripts and uploads them to S3.
    
    Expected event payload:
    {
        "videoYoutubeIds": ["abc123", "def456"],
        "owner": "cognito-sub-id",
        "channelId": "dynamodb-channel-id",
        "bucketName": "amplify-storage-bucket-name"
    }
    
    Returns:
    {
        "results": [
            {"videoYoutubeId": "abc123", "success": true, "transcriptKey": "transcripts/..."},
            {"videoYoutubeId": "def456", "success": false, "error": "No transcript available"}
        ]
    }
    """
    logger.info(f"Handler invoked with {len(event.get('videoYoutubeIds', []))} video(s)")
    
    # Validate required fields
    required_fields = ['videoYoutubeIds', 'owner', 'channelId', 'bucketName']
    missing_fields = [field for field in required_fields if field not in event]
    
    if missing_fields:
        logger.error(f"Missing required fields: {missing_fields}")
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            })
        }
    
    video_youtube_ids = event['videoYoutubeIds']
    owner = event['owner']
    channel_id = event['channelId']
    bucket_name = event['bucketName']
    
    logger.info(f"Processing transcripts for channel {channel_id}, owner {owner}, bucket {bucket_name}")
    
    # Handle empty video list
    if not video_youtube_ids:
        logger.info("No videos to process")
        return {'results': []}
    
    # Initialize S3 client
    s3_client = boto3.client('s3')
    
    # Process each video
    results = []
    for video_id in video_youtube_ids:
        logger.info(f"Processing video {video_id}")
        result = process_video_transcript(
            video_id=video_id,
            owner=owner,
            channel_id=channel_id,
            bucket_name=bucket_name,
            s3_client=s3_client
        )
        results.append(result)
    
    success_count = sum(1 for r in results if r.get('success'))
    logger.info(f"Completed processing: {success_count}/{len(results)} successful")
    
    return {'results': results}


def process_video_transcript(
    video_id: str,
    owner: str,
    channel_id: str,
    bucket_name: str,
    s3_client: Any
) -> Dict[str, Any]:
    """
    Process a single video transcript: fetch, concatenate, and upload to S3.
    
    Returns a result dict with videoYoutubeId, success, and optional transcriptKey or error.
    """
    try:
        # Fetch transcript segments
        logger.debug(f"Fetching transcript for video {video_id}")
        ytt = YouTubeTranscriptApi()
        transcript_segments = ytt.fetch(video_id)
        transcript_text = " ".join(entry.text for entry in transcript_segments)
        logger.debug(f"Transcript length for {video_id}: {len(transcript_text)} characters")
        
        # Build S3 key
        s3_key = build_s3_key(owner, channel_id, video_id)
        
        # Upload to S3
        logger.debug(f"Uploading transcript to s3://{bucket_name}/{s3_key}")
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=transcript_text.encode('utf-8'),
            ContentType='text/plain; charset=utf-8'
        )
        
        logger.info(f"Successfully saved transcript for video {video_id}")
        return {
            'videoYoutubeId': video_id,
            'success': True,
            'transcriptKey': s3_key
        }
        
    except TranscriptsDisabled:
        logger.warning(f"Transcripts disabled for video {video_id}")
        return {
            'videoYoutubeId': video_id,
            'success': False,
            'error': 'Transcripts disabled'
        }
    except NoTranscriptFound:
        logger.warning(f"No transcript found for video {video_id}")
        return {
            'videoYoutubeId': video_id,
            'success': False,
            'error': 'No transcript found'
        }
    except Exception as e:
        # Handle S3 failures and other unexpected errors
        error_message = str(e)
        if 'S3' in type(e).__name__ or 'Bucket' in error_message:
            error_message = f'S3 upload failed: {error_message}'
            logger.error(f"S3 upload failed for video {video_id}: {error_message}")
        else:
            logger.error(f"Unexpected error processing video {video_id}: {error_message}")
        
        return {
            'videoYoutubeId': video_id,
            'success': False,
            'error': error_message
        }


def build_s3_key(owner: str, channel_id: str, video_youtube_id: str) -> str:
    """
    Build the S3 key for storing a transcript.
    
    Format: transcripts/{owner}/{channelId}/{videoYoutubeId}.txt
    """
    return f'transcripts/{owner}/{channel_id}/{video_youtube_id}.txt'

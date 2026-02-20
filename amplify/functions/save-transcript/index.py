import json
import boto3
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from typing import Any, Dict, List


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
    # Validate required fields
    required_fields = ['videoYoutubeIds', 'owner', 'channelId', 'bucketName']
    missing_fields = [field for field in required_fields if field not in event]
    
    if missing_fields:
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
    
    # Handle empty video list
    if not video_youtube_ids:
        return {'results': []}
    
    # Initialize S3 client
    s3_client = boto3.client('s3')
    
    # Process each video
    results = []
    for video_id in video_youtube_ids:
        result = process_video_transcript(
            video_id=video_id,
            owner=owner,
            channel_id=channel_id,
            bucket_name=bucket_name,
            s3_client=s3_client
        )
        results.append(result)
    
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
        transcript_segments = YouTubeTranscriptApi.get_transcript(video_id)
        
        # Concatenate segment texts
        transcript_text = concatenate_segments(transcript_segments)
        
        # Build S3 key
        s3_key = build_s3_key(owner, channel_id, video_id)
        
        # Upload to S3
        s3_client.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=transcript_text.encode('utf-8'),
            ContentType='text/plain; charset=utf-8'
        )
        
        return {
            'videoYoutubeId': video_id,
            'success': True,
            'transcriptKey': s3_key
        }
        
    except TranscriptsDisabled:
        return {
            'videoYoutubeId': video_id,
            'success': False,
            'error': 'Transcripts disabled'
        }
    except NoTranscriptFound:
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
        
        return {
            'videoYoutubeId': video_id,
            'success': False,
            'error': error_message
        }


def concatenate_segments(segments: List[Dict[str, Any]]) -> str:
    """
    Concatenate transcript segments into a single plain-text string.
    
    Each segment has a 'text' field containing the caption text.
    """
    return ' '.join(segment['text'] for segment in segments)


def build_s3_key(owner: str, channel_id: str, video_youtube_id: str) -> str:
    """
    Build the S3 key for storing a transcript.
    
    Format: transcripts/{owner}/{channelId}/{videoYoutubeId}.txt
    """
    return f'transcripts/{owner}/{channel_id}/{video_youtube_id}.txt'

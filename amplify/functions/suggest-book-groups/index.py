import json
import os
from typing import Dict, List, Any, Optional
from strands import Agent
from strands_xai import xAIModel
import boto3


def fetch_videos_by_channel(channel_id: str) -> List[Dict[str, Any]]:
    """
    Fetch all videos for a given channel from DynamoDB.
    
    Args:
        channel_id: The ID of the channel to fetch videos for
        
    Returns:
        List of video dictionaries containing id, youtubeId, title, description, duration
        
    Raises:
        Exception: If DynamoDB query fails
    """
    try:
        # Get table name from environment variable
        table_name = os.environ.get('VIDEO_TABLE_NAME')
        
        if not table_name:
            raise ValueError('VIDEO_TABLE_NAME environment variable not set')
        
        # Initialize DynamoDB client
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(table_name)
        
        # Query videos by channelId using the secondary index
        response = table.query(
            IndexName='byChannel',
            KeyConditionExpression='channelId = :channelId',
            ExpressionAttributeValues={
                ':channelId': channel_id
            }
        )
        
        videos = response.get('Items', [])
        
        # Handle pagination if there are more results
        while 'LastEvaluatedKey' in response:
            response = table.query(
                IndexName='byChannel',
                KeyConditionExpression='channelId = :channelId',
                ExpressionAttributeValues={
                    ':channelId': channel_id
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            videos.extend(response.get('Items', []))
        
        print(f"Fetched {len(videos)} videos from DynamoDB for channel {channel_id}")
        
        return videos
        
    except Exception as e:
        print(f"Error fetching videos from DynamoDB: {str(e)}")
        raise Exception(f"Failed to fetch videos: {str(e)}")


def create_agent_client() -> Agent:
    """
    Create and configure a Strands Agent client with xAI model.
    
    Returns:
        Configured Agent instance ready for use
        
    Raises:
        ValueError: If XAI_API_KEY environment variable is not set
    """
    # Get xAI API key from environment variable
    api_key = os.environ.get('XAI_API_KEY')
    
    if not api_key:
        raise ValueError('XAI_API_KEY environment variable not set')
    
    # Create xAI model instance
    # Using grok-4-1-fast-non-reasoning for faster responses without reasoning overhead
    model = xAIModel(
        client_args={"api_key": api_key},
        model_id="grok-4-1-fast-non-reasoning-latest",
        params={
            "temperature": 0.7,  # Balanced creativity for summaries and clustering
            "max_tokens": 2048   # Sufficient for summaries and clustering responses
        }
    )
    
    # Create and return agent with the xAI model
    agent = Agent(model=model)
    
    print("Successfully created Strands Agent client with xAI model")
    
    return agent


def handler(event: Dict[str, Any], _context: Any) -> Dict[str, Any]:
    """
    Lambda handler for suggesting book groups based on video content.
    
    This function analyzes videos from a YouTube channel and uses AI to cluster
    them into thematic groups for potential ebook creation.
    
    Args:
        event: Lambda event containing:
            - arguments: Dict with 'channelId' key
        context: Lambda context object
        
    Returns:
        Dict containing:
            - success: bool indicating if operation succeeded
            - groups: List of group objects with title, themeDescription, videoIds
            - error: Optional error message if operation failed
    """
    try:
        # Extract channelId from event arguments
        channel_id = event.get('arguments', {}).get('channelId')
        
        if not channel_id:
            return {
                'success': False,
                'groups': [],
                'error': 'channelId is required'
            }
        
        # Task 3.1: Fetch videos from DynamoDB
        videos = fetch_videos_by_channel(channel_id)
        
        if not videos:
            return {
                'success': False,
                'groups': [],
                'error': 'No videos found for this channel'
            }
        
        print(f"Successfully fetched {len(videos)} videos for channel {channel_id}")
        
        # Task 3.2.1: Create Strands Agent client
        agent = create_agent_client()
        
        # TODO: Implement summary generation (Task 3.2.2-3.2.4)
        # TODO: Implement video clustering (Task 3.3)
        # TODO: Implement BookGroup persistence (Task 3.4)
        
        # Placeholder return for basic structure
        return {
            'success': True,
            'groups': [],
            'error': None
        }
        
    except Exception as e:
        # Log error for CloudWatch
        print(f"Error in suggestBookGroups handler: {str(e)}")
        
        return {
            'success': False,
            'groups': [],
            'error': f'An error occurred while processing: {str(e)}'
        }

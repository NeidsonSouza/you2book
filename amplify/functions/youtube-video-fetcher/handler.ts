import { google } from 'googleapis';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import type { Schema } from '../../data/resource';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

interface YouTubeError {
  code?: number;
  message?: string;
  errors?: Array<{ reason?: string }>;
}

type FetchChannelVideosHandler = Schema['fetchChannelVideos']['functionHandler'];

export const handler: FetchChannelVideosHandler = async (event, context) => {
  try {
    const { channelUrl, channelId } = event.arguments;
    
    // Get the authenticated user's ID from the context
    // In Amplify Gen2, the identity is available through context
    const identity = context.identity as any;
    const ownerId = identity?.claims?.sub || identity?.sub;

    if (!ownerId) {
      return {
        success: false,
        message: 'User not authenticated',
        videoCount: 0,
      };
    }

    // Get YouTube API key from Secrets Manager
    const secretResponse = await secretsClient.send(
      new GetSecretValueCommand({
        SecretId: process.env.YOUTUBE_API_KEY_SECRET!,
      })
    );

    if (!secretResponse.SecretString) {
      throw new Error('YouTube API key not found in Secrets Manager');
    }

    const youtube = google.youtube({
      version: 'v3',
      auth: secretResponse.SecretString,
    });

    // Extract channel ID from URL
    const youtubeChannelId = await extractChannelId(channelUrl, youtube);
    if (!youtubeChannelId) {
      return {
        success: false,
        message: 'Invalid YouTube channel URL format. Please use a valid YouTube channel URL (e.g., youtube.com/channel/UC..., youtube.com/@username, or youtube.com/c/channelname)',
        videoCount: 0,
      };
    }

    // Get channel's uploads playlist ID with retry logic
    const channelResponse = await retryWithBackoff(async () => {
      return await youtube.channels.list({
        part: ['contentDetails'],
        id: [youtubeChannelId],
      });
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return {
        success: false,
        message: 'Channel not found or is not accessible. Please verify the channel URL and ensure it is public.',
        videoCount: 0,
      };
    }

    const uploadsPlaylistId = channelResponse.data.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      return {
        success: false,
        message: 'Could not find uploads playlist for channel',
        videoCount: 0,
      };
    }

    // Get videos from uploads playlist with retry logic
    const playlistResponse = await retryWithBackoff(async () => {
      return await youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 50, // Start with 50 videos for MVP
      });
    });

    const videoIds = playlistResponse.data.items
      ?.map((item: any) => item.snippet?.resourceId?.videoId)
      .filter(Boolean) || [];

    if (videoIds.length === 0) {
      return {
        success: true,
        message: 'No videos found for this channel',
        videoCount: 0,
      };
    }

    // Get detailed video information including duration with retry logic
    const videosResponse = await retryWithBackoff(async () => {
      return await youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: videoIds,
      });
    });

    // Transform API response to match GraphQL Video schema
    const videos: VideoMetadata[] = videosResponse.data.items?.map((video: any) => ({
      youtubeId: video.id!,
      title: video.snippet?.title || 'Untitled Video',
      description: truncateDescription(video.snippet?.description || ''),
      duration: video.contentDetails?.duration || 'PT0S',
    })) || [];

    // Store videos in DynamoDB with duplicate detection
    const storedCount = await storeVideos(videos, channelId, ownerId);

    return {
      success: true,
      message: `Successfully fetched and stored ${storedCount} videos`,
      videoCount: storedCount,
    };
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    
    // Handle specific YouTube API errors
    const youtubeError = error as YouTubeError;
    if (youtubeError.code === 403) {
      const rateLimitError = youtubeError.errors?.some(e => e.reason === 'quotaExceeded' || e.reason === 'rateLimitExceeded');
      if (rateLimitError) {
        return {
          success: false,
          message: 'YouTube API rate limit exceeded. Please try again later.',
          videoCount: 0,
        };
      }
      return {
        success: false,
        message: 'Access denied to YouTube API. Please check API key permissions.',
        videoCount: 0,
      };
    } else if (youtubeError.code === 404) {
      return {
        success: false,
        message: 'Channel not found. Please verify the channel URL.',
        videoCount: 0,
      };
    } else if (youtubeError.code === 400) {
      return {
        success: false,
        message: 'Invalid request to YouTube API. Please check the channel URL format.',
        videoCount: 0,
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      videoCount: 0,
    };
  }
};

/**
 * Store videos in DynamoDB with duplicate detection and updates
 * Ensures referential integrity with channels
 */
async function storeVideos(
  videos: VideoMetadata[],
  channelId: string,
  ownerId: string
): Promise<number> {
  if (!process.env.VIDEO_TABLE_NAME) {
    throw new Error('VIDEO_TABLE_NAME environment variable not set');
  }

  const tableName = process.env.VIDEO_TABLE_NAME;
  let storedCount = 0;

  // Process videos in batches to handle duplicates efficiently
  for (const video of videos) {
    try {
      // Check if video already exists using the byYoutubeId GSI
      const existingVideo = await findVideoByYoutubeId(video.youtubeId, tableName);

      if (existingVideo) {
        // Update existing video if it belongs to the same channel
        if (existingVideo.channelId === channelId) {
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: {
              ...existingVideo,
              title: video.title,
              description: video.description,
              duration: video.duration,
              updatedAt: new Date().toISOString(),
            },
          }));
          storedCount++;
        }
        // Skip if video belongs to a different channel (referential integrity)
      } else {
        // Create new video record
        const now = new Date().toISOString();
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: {
            id: randomUUID(),
            youtubeId: video.youtubeId,
            title: video.title,
            description: video.description,
            duration: video.duration,
            channelId: channelId,
            owner: ownerId,
            createdAt: now,
            updatedAt: now,
            __typename: 'Video',
          },
        }));
        storedCount++;
      }
    } catch (error) {
      console.error(`Error storing video ${video.youtubeId}:`, error);
      // Continue with other videos even if one fails
    }
  }

  return storedCount;
}

/**
 * Find a video by YouTube ID using the byYoutubeId GSI
 */
async function findVideoByYoutubeId(
  youtubeId: string,
  tableName: string
): Promise<any | null> {
  try {
    const response = await docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'byYoutubeId',
      KeyConditionExpression: 'youtubeId = :youtubeId',
      ExpressionAttributeValues: {
        ':youtubeId': youtubeId,
      },
      Limit: 1,
    }));

    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  } catch (error) {
    console.error(`Error finding video by YouTube ID ${youtubeId}:`, error);
    return null;
  }
}

/**
 * Extract channel ID from various YouTube URL formats
 * Handles: /channel/ID, /@handle, /c/customname, /user/username
 */
async function extractChannelId(url: string, youtube: any): Promise<string | null> {
  // Direct channel ID format: youtube.com/channel/UC...
  const channelIdMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelIdMatch) {
    return channelIdMatch[1];
  }

  // Handle format: youtube.com/@username
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];
    try {
      // Search for channel by handle
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1,
      });
      
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        return searchResponse.data.items[0].snippet?.channelId || null;
      }
    } catch (error) {
      console.error('Error searching for channel by handle:', error);
    }
  }

  // Custom URL format: youtube.com/c/customname
  const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
  if (customMatch) {
    const customName = customMatch[1];
    try {
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: customName,
        type: ['channel'],
        maxResults: 1,
      });
      
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        return searchResponse.data.items[0].snippet?.channelId || null;
      }
    } catch (error) {
      console.error('Error searching for channel by custom name:', error);
    }
  }

  // Legacy user format: youtube.com/user/username
  const userMatch = url.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/);
  if (userMatch) {
    const username = userMatch[1];
    try {
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        q: username,
        type: ['channel'],
        maxResults: 1,
      });
      
      if (searchResponse.data.items && searchResponse.data.items.length > 0) {
        return searchResponse.data.items[0].snippet?.channelId || null;
      }
    } catch (error) {
      console.error('Error searching for channel by username:', error);
    }
  }

  return null;
}

/**
 * Retry function with exponential backoff for handling rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error
      const isRateLimit = error.code === 429 || 
        error.errors?.some((e: any) => e.reason === 'rateLimitExceeded' || e.reason === 'quotaExceeded');
      
      if (!isRateLimit || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Truncate description to reasonable length for storage
 */
function truncateDescription(description: string, maxLength: number = 500): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength) + '...';
}
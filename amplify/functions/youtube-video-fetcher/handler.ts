import { google } from 'googleapis';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

interface FetchVideosEvent {
  channelUrl: string;
  ownerId: string;
}

export const handler = async (event: FetchVideosEvent): Promise<VideoMetadata[]> => {
  try {
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
    const channelId = extractChannelId(event.channelUrl);
    if (!channelId) {
      throw new Error('Invalid YouTube channel URL format');
    }

    // Get channel's uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId],
    });

    const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('Could not find uploads playlist for channel');
    }

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50, // Start with 50 videos for MVP
    });

    const videoIds = playlistResponse.data.items?.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean) || [];

    if (videoIds.length === 0) {
      return [];
    }

    // Get detailed video information including duration
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: videoIds,
    });

    const videos: VideoMetadata[] = videosResponse.data.items?.map((video: any) => ({
      youtubeId: video.id!,
      title: video.snippet?.title || '',
      description: video.snippet?.description || '',
      duration: video.contentDetails?.duration || '',
    })) || [];

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    throw error;
  }
};

function extractChannelId(url: string): string | null {
  // Handle different YouTube channel URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
import { client } from '../lib/amplifyClient';

/**
 * Metadata for a YouTube video fetched from the YouTube API.
 */
export interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

/**
 * Fetches all videos from a YouTube channel using the backend Lambda function.
 * 
 * @param channelUrl - The YouTube channel URL (supports /channel/, /@handle, /c/, /user/ formats)
 * @throws {Error} If the query fails, returns no data, or the backend reports an error
 * @returns A promise that resolves to an array of video metadata objects
 */
export async function fetchVideosFromYouTube(channelUrl: string): Promise<VideoMetadata[]> {
  const result = await client.queries.fetchChannelVideos({
    channelUrl: channelUrl,
  });

  if (result.errors) {
    const message = result.errors.map(e => e.message).join(', ');
    console.error('[youtubeService.fetchVideosFromYouTube] Query failed', { channelUrl, error: message });
    throw new Error(`fetchVideosFromYouTube: ${message}`);
  }

  if (!result.data) {
    console.error('[youtubeService.fetchVideosFromYouTube] No data returned', { channelUrl });
    throw new Error('fetchVideosFromYouTube: No data returned from query');
  }

  if (!result.data.success) {
    console.error('[youtubeService.fetchVideosFromYouTube] Backend reported error', { channelUrl, message: result.data.message });
    throw new Error(`fetchVideosFromYouTube: ${result.data.message}`);
  }

  if (!result.data.videos || !Array.isArray(result.data.videos)) {
    return [];
  }

  return result.data.videos.filter((v): v is VideoMetadata => v !== null && v !== undefined);
}



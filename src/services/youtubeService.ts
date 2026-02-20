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
    throw new Error(result.errors.map(e => e.message).join(', '));
  }

  if (!result.data) {
    throw new Error('No data returned from query');
  }

  if (!result.data.success) {
    throw new Error(result.data.message);
  }

  if (!result.data.videos || !Array.isArray(result.data.videos)) {
    return [];
  }

  return result.data.videos.filter((v): v is VideoMetadata => v !== null && v !== undefined);
}



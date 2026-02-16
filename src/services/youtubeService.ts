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

/**
 * Saves an array of video metadata to the database for a specific channel.
 * Skips videos that already exist (based on youtubeId) to avoid duplicates.
 * Collects all errors during the save process and throws a summary error if any occur.
 * 
 * @param videos - Array of video metadata objects to save
 * @param channelId - The unique identifier of the channel these videos belong to
 * @throws {Error} If fetching existing videos fails or if any video save operation fails
 * @returns A promise that resolves when all new videos are saved
 */
export async function saveVideosToDatabase(videos: VideoMetadata[], channelId: string): Promise<void> {
  const errors: string[] = [];

  const existingVideos = await client.models.Video.list({
    filter: { channelId: { eq: channelId } }
  });

  if (existingVideos.errors) {
    throw new Error('Failed to fetch existing videos: ' + existingVideos.errors.map(e => e.message).join(', '));
  }

  const existingYoutubeIds = new Set(
    existingVideos.data.map(v => v.youtubeId)
  );

  for (const video of videos) {
    if (!existingYoutubeIds.has(video.youtubeId)) {
      const result = await client.models.Video.create({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        channelId: channelId,
      });

      if (result.errors) {
        const errorMsg = `Failed to save video ${video.youtubeId}: ${result.errors.map(e => e.message).join(', ')}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Video save completed with ${errors.length} error(s):\n${errors.join('\n')}`);
  }
}

/**
 * Extracts a human-readable channel name from a YouTube URL.
 * Supports various YouTube URL formats including /channel/, /c/, /user/, and @handle.
 * Falls back to the hostname if no channel identifier is found.
 * 
 * @param url - The YouTube channel URL to parse
 * @returns The extracted channel name or hostname as fallback
 */
export function extractChannelNameFromUrl(url: string): string {
  const urlObj = new URL(url);
  if (urlObj.hostname.includes('youtube.com')) {
    const pathParts = urlObj.pathname.split('/');
    const channelIndex = pathParts.findIndex(part => part === 'channel' || part === 'c' || part === 'user');
    if (channelIndex !== -1 && pathParts[channelIndex + 1]) {
      return pathParts[channelIndex + 1];
    }
  }
  return urlObj.hostname;
}

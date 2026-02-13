import { client } from '../lib/amplifyClient';

export interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

export async function fetchVideosFromYouTube(channelUrl: string): Promise<VideoMetadata[]> {
  const result = await client.queries.sayHello({
    name: channelUrl,
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

  return result.data.videos;
}

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

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
    console.warn('No videos array in response, returning empty array');
    return [];
  }

  return result.data.videos.filter((video): video is VideoMetadata => 
    video !== null && video !== undefined
  );
}

export async function saveVideosToDatabase(videos: VideoMetadata[], channelId: string): Promise<void> {
  const existingVideos = await client.models.Video.list({
    filter: { channelId: { eq: channelId } }
  });

  const existingYoutubeIds = new Set(
    existingVideos.data.map(v => v.youtubeId)
  );

  for (const video of videos) {
    if (!existingYoutubeIds.has(video.youtubeId)) {
      try {
        await client.models.Video.create({
          youtubeId: video.youtubeId,
          title: video.title,
          description: video.description || '',
          duration: video.duration,
          channelId: channelId,
        });
      } catch (error) {
        console.error(`Error saving video ${video.youtubeId}:`, error);
      }
    }
  }
}

export function extractChannelNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      const pathParts = urlObj.pathname.split('/');
      const channelIndex = pathParts.findIndex(part => part === 'channel' || part === 'c' || part === 'user');
      if (channelIndex !== -1 && pathParts[channelIndex + 1]) {
        return pathParts[channelIndex + 1];
      }
    }
    return urlObj.hostname;
  } catch {
    return 'New Channel';
  }
}

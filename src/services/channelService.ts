import { client } from '../lib/amplifyClient';

/**
 * Deletes a channel and all associated resources (videos, ebooks, ebook-video relationships).
 * Collects all errors during the deletion process and throws a summary error if any occur.
 * 
 * @param channelId - The unique identifier of the channel to delete
 * @throws {Error} If any deletion operation fails, with details of all failures
 * @returns A promise that resolves when the channel and all related data are deleted
 */
export async function deleteChannel(channelId: string): Promise<void> {
  const errors: string[] = [];

  // Delete all videos associated with this channel
  const videosResult = await client.models.Video.list({
    filter: { channelId: { eq: channelId } }
  });

  if (videosResult.errors) {
    const message = videosResult.errors.map(e => e.message).join(', ');
    console.error('[channelService.deleteChannel] Failed to fetch videos', { channelId, error: message });
    throw new Error(`deleteChannel: Failed to fetch videos: ${message}`);
  }

  const videos = videosResult.data;

  for (const video of videos) {
    const deleteVideoResult = await client.models.Video.delete({ id: video.id });
    if (deleteVideoResult.errors) {
      const errorMsg = `Failed to delete video ${video.id}: ${deleteVideoResult.errors.map(e => e.message).join(', ')}`;
      console.error('[channelService.deleteChannel] Failed to delete video', { channelId, videoId: video.id, error: errorMsg });
      errors.push(errorMsg);
    }
  }

  // Delete all ebooks associated with this channel
  const ebooksResult = await client.models.Ebook.list({
    filter: { channelId: { eq: channelId } }
  });

  if (ebooksResult.errors) {
    const message = ebooksResult.errors.map(e => e.message).join(', ');
    console.error('[channelService.deleteChannel] Failed to fetch ebooks', { channelId, error: message });
    throw new Error(`deleteChannel: Failed to fetch ebooks: ${message}`);
  }

  const ebooks = ebooksResult.data;

  for (const ebook of ebooks) {
    // Delete all EbookVideos for this ebook
    const ebookVideosResult = await client.models.EbookVideo.list({
      filter: { ebookId: { eq: ebook.id } }
    });

    if (ebookVideosResult.errors) {
      const errorMsg = `Failed to fetch ebook videos for ebook ${ebook.id}: ${ebookVideosResult.errors.map(e => e.message).join(', ')}`;
      console.error('[channelService.deleteChannel] Failed to fetch ebook videos', { channelId, ebookId: ebook.id, error: errorMsg });
      errors.push(errorMsg);
    } else {
      for (const ebookVideo of ebookVideosResult.data) {
        const deleteEbookVideoResult = await client.models.EbookVideo.delete({ id: ebookVideo.id });
        if (deleteEbookVideoResult.errors) {
          const errorMsg = `Failed to delete ebook video ${ebookVideo.id}: ${deleteEbookVideoResult.errors.map(e => e.message).join(', ')}`;
          console.error('[channelService.deleteChannel] Failed to delete ebook video', { channelId, ebookId: ebook.id, ebookVideoId: ebookVideo.id, error: errorMsg });
          errors.push(errorMsg);
        }
      }
    }

    // Delete the ebook itself
    const deleteEbookResult = await client.models.Ebook.delete({ id: ebook.id });
    if (deleteEbookResult.errors) {
      const errorMsg = `Failed to delete ebook ${ebook.id}: ${deleteEbookResult.errors.map(e => e.message).join(', ')}`;
      console.error('[channelService.deleteChannel] Failed to delete ebook', { channelId, ebookId: ebook.id, error: errorMsg });
      errors.push(errorMsg);
    }
  }

  // Delete the channel
  const result = await client.models.Channel.delete({ id: channelId });

  if (result.errors) {
    const errorMsg = 'Failed to delete channel: ' + result.errors.map(e => e.message).join(', ');
    console.error('[channelService.deleteChannel] Failed to delete channel', { channelId, error: errorMsg });
    errors.push(errorMsg);
  }

  // Report all collected errors
  if (errors.length > 0) {
    throw new Error(`Channel deletion completed with ${errors.length} error(s):\n${errors.join('\n')}`);
  }
}

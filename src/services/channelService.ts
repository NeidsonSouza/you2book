import { client } from '../lib/amplifyClient';

export async function deleteChannel(channelId: string): Promise<void> {
  // Delete all videos associated with this channel
  const videosResult = await client.models.Video.list({
    filter: { channelId: { eq: channelId } }
  });

  if (videosResult.errors) {
    throw new Error('Failed to fetch videos for deletion: ' + videosResult.errors.map(e => e.message).join(', '));
  }

  const videos = videosResult.data;
  console.log(`Found ${videos.length} videos to delete`);

  for (const video of videos) {
    const deleteVideoResult = await client.models.Video.delete({ id: video.id });
    if (deleteVideoResult.errors) {
      console.error('Error deleting video:', video.id, deleteVideoResult.errors);
    } else {
      console.log('Deleted video:', video.id);
    }
  }

  // Delete all ebooks associated with this channel
  const ebooksResult = await client.models.Ebook.list({
    filter: { channelId: { eq: channelId } }
  });

  if (ebooksResult.errors) {
    throw new Error('Failed to fetch ebooks for deletion: ' + ebooksResult.errors.map(e => e.message).join(', '));
  }

  const ebooks = ebooksResult.data;
  console.log(`Found ${ebooks.length} ebooks to delete`);

  for (const ebook of ebooks) {
    // Delete all EbookVideos for this ebook
    const ebookVideosResult = await client.models.EbookVideo.list({
      filter: { ebookId: { eq: ebook.id } }
    });

    if (!ebookVideosResult.errors) {
      for (const ebookVideo of ebookVideosResult.data) {
        const deleteEbookVideoResult = await client.models.EbookVideo.delete({ id: ebookVideo.id });
        if (deleteEbookVideoResult.errors) {
          console.error('Error deleting ebook video:', ebookVideo.id, deleteEbookVideoResult.errors);
        } else {
          console.log('Deleted ebook video:', ebookVideo.id);
        }
      }
    }

    // Delete the ebook itself
    const deleteEbookResult = await client.models.Ebook.delete({ id: ebook.id });
    if (deleteEbookResult.errors) {
      console.error('Error deleting ebook:', ebook.id, deleteEbookResult.errors);
    } else {
      console.log('Deleted ebook:', ebook.id);
    }
  }

  // Delete the channel
  const result = await client.models.Channel.delete({ id: channelId });

  if (result.errors) {
    throw new Error('Failed to delete channel: ' + result.errors.map(e => e.message).join(', '));
  }

  console.log('Channel and all related data deleted successfully');
}

import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

function App() {
  const { user, signOut } = useAuthenticator();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Array<Schema["Channel"]["type"]>>([]);
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    client.models.Channel.observeQuery().subscribe({
      next: (data) => setChannels([...data.items]),
    });
  }, []);

  function createChannel() {
    if (newChannelUrl.trim()) {
      setIsCreatingChannel(true);
      setFetchError(null);
      
      // Extract channel name from URL or use a default
      const channelName = extractChannelNameFromUrl(newChannelUrl.trim()) || 'New Channel';
      const channelUrl = newChannelUrl.trim();
      
      client.models.Channel.create({ 
        name: channelName,
        url: channelUrl 
      }).then(async (result) => {
        if (result.data && result.data.id) {
          // Fetch videos using the custom query
          try {
            const videos = await fetchVideosFromYouTube(channelUrl);
            
            if (videos.length > 0) {
              // Save videos to DynamoDB using Amplify Data client
              await saveVideosToDatabase(videos, result.data.id);
              console.log(`Successfully saved ${videos.length} videos`);
            } else {
              console.log('No videos found for this channel');
            }
          } catch (error) {
            console.error('Error fetching or saving videos:', error);
            setFetchError('Failed to fetch videos: ' + (error as Error).message);
          }
        }
        setIsCreatingChannel(false);
        setNewChannelUrl("");
      }).catch((error) => {
        console.error('Error creating channel:', error);
        setFetchError('Failed to create channel: ' + (error as Error).message);
        setIsCreatingChannel(false);
      });
    }
  }

  async function fetchVideosFromYouTube(channelUrl: string): Promise<VideoMetadata[]> {
      // Call the custom query which invokes the Lambda function
      const result = await client.queries.sayHello({
        name: channelUrl,
      });

      if (result.errors) {
        throw new Error(result.errors.map(e => e.message).join(', '));
      }

      if (!result.data) {
        throw new Error('No data returned from query');
      }

      // Parse the JSON response
      const response = JSON.parse(result.data as string) as {
        success: boolean;
        message: string;
        videos: VideoMetadata[];
      };

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.videos;
    }

  async function saveVideosToDatabase(videos: VideoMetadata[], channelId: string): Promise<void> {
    // Check for existing videos to avoid duplicates
    const existingVideos = await client.models.Video.list({
      filter: { channelId: { eq: channelId } }
    });

    const existingYoutubeIds = new Set(
      existingVideos.data.map(v => v.youtubeId)
    );

    // Save only new videos
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
          // Continue with other videos even if one fails
        }
      }
    }
  }

  function extractChannelNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract channel name from YouTube URL patterns
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createChannel();
  }

  function handleChannelClick(url: string) {
    const encodedUrl = encodeURIComponent(url);
    navigate(`/channel/${encodedUrl}`);
  }

  async function handleDeleteClick(id: string) {
    if (window.confirm("Are you sure you want to delete this channel and all its videos?")) {
      try {
        console.log('Attempting to delete channel with ID:', id);
        
        // First, fetch all videos associated with this channel
        const videosResult = await client.models.Video.list({
          filter: { channelId: { eq: id } }
        });
        
        if (videosResult.errors) {
          console.error('Error fetching videos:', videosResult.errors);
          alert('Failed to fetch videos for deletion: ' + videosResult.errors.map(e => e.message).join(', '));
          return;
        }
        
        // Delete all associated videos
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
        
        // Fetch all ebooks associated with this channel
        const ebooksResult = await client.models.Ebook.list({
          filter: { channelId: { eq: id } }
        });
        
        if (ebooksResult.errors) {
          console.error('Error fetching ebooks:', ebooksResult.errors);
          alert('Failed to fetch ebooks for deletion: ' + ebooksResult.errors.map(e => e.message).join(', '));
          return;
        }
        
        // Delete all associated ebooks and their EbookVideos
        const ebooks = ebooksResult.data;
        console.log(`Found ${ebooks.length} ebooks to delete`);
        
        for (const ebook of ebooks) {
          // First delete all EbookVideos for this ebook
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
          
          // Then delete the ebook itself
          const deleteEbookResult = await client.models.Ebook.delete({ id: ebook.id });
          if (deleteEbookResult.errors) {
            console.error('Error deleting ebook:', ebook.id, deleteEbookResult.errors);
          } else {
            console.log('Deleted ebook:', ebook.id);
          }
        }
        
        // Now delete the channel
        const result = await client.models.Channel.delete({ id });
        console.log('Delete result:', result);
        
        if (result.errors) {
          console.error('Delete errors:', result.errors);
          alert('Failed to delete channel: ' + result.errors.map(e => e.message).join(', '));
        } else {
          console.log('Channel and all related data deleted successfully');
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete channel: ' + (error as Error).message);
      }
    }
  }

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Channels</h1>
      
      <form onSubmit={handleSubmit} className="add-channel-form">
        <input
          type="text"
          value={newChannelUrl}
          onChange={(e) => setNewChannelUrl(e.target.value)}
          placeholder="Enter channel URL"
          className="channel-input"
          disabled={isCreatingChannel}
        />
        <button type="submit" disabled={!newChannelUrl.trim() || isCreatingChannel}>
          {isCreatingChannel ? '⏳ Adding & Fetching Videos...' : '+ Add Channel'}
        </button>
      </form>

      {fetchError && (
        <div className="error-message" style={{ 
          padding: '12px', 
          marginBottom: '16px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          {fetchError}
        </div>
      )}

      <ul>
        {channels.map((channel) => (
          <li key={channel.id} className="channel-item">
            <span 
              className={`channel-content ${channel.url ? 'clickable' : ''}`}
              onClick={() => channel.url && handleChannelClick(channel.url)}
            >
              <div className="channel-name">{channel.name || 'Unnamed Channel'}</div>
              <div className="channel-url">{channel.url || 'No URL'}</div>
            </span>
            <button
              onClick={() => handleDeleteClick(channel.id)}
              className="delete-button"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;

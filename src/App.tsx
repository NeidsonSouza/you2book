import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';
import { 
  fetchVideosFromYouTube, 
  saveVideosToDatabase, 
  extractChannelNameFromUrl 
} from './services/youtubeService';
import { deleteChannel } from './services/channelService';
import { client } from './lib/amplifyClient';

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



  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
        await deleteChannel(id);
      } catch (error) {
        console.error('Delete error:', error);
        alert((error as Error).message);
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
        <div className="error-message">
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

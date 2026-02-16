import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';
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

  async function createChannel(): Promise<void> {
    if (newChannelUrl.trim()) {
      setIsCreatingChannel(true);
      setFetchError(null);
      
      const channelUrl = newChannelUrl.trim();
      
      try {
        // Call the Lambda function which handles everything:
        // - Extracts channel ID from URL
        // - Fetches channel metadata from YouTube
        // - Creates/updates channel in database
        // - Fetches all videos from YouTube
        // - Saves videos to database
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

        console.log(result.data.message);
        setNewChannelUrl("");
      } catch (error) {
        console.error('Error adding channel:', error);
        setFetchError('Failed to add channel: ' + (error as Error).message);
      } finally {
        setIsCreatingChannel(false);
      }
    }
  }



  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    createChannel();
  }

  function handleChannelClick(url: string): void {
    const encodedUrl = encodeURIComponent(url);
    navigate(`/channel/${encodedUrl}`);
  }

  async function handleDeleteClick(id: string): Promise<void> {
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

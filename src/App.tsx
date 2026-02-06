import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom';

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Array<Schema["Channel"]["type"]>>([]);
  const [newChannelUrl, setNewChannelUrl] = useState("");

  useEffect(() => {
    client.models.Channel.observeQuery().subscribe({
      next: (data) => setChannels([...data.items]),
    });
  }, []);

  function createChannel() {
    if (newChannelUrl.trim()) {
      // Extract channel name from URL or use a default
      const channelName = extractChannelNameFromUrl(newChannelUrl.trim()) || 'New Channel';
      client.models.Channel.create({ 
        name: channelName,
        url: newChannelUrl.trim() 
      });
      setNewChannelUrl("");
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
    if (window.confirm("Are you sure you want to delete this channel item?")) {
      try {
        console.log('Attempting to delete channel with ID:', id);
        const result = await client.models.Channel.delete({ id });
        console.log('Delete result:', result);
        
        if (result.errors) {
          console.error('Delete errors:', result.errors);
          alert('Failed to delete channel: ' + result.errors.map(e => e.message).join(', '));
        } else {
          console.log('Channel deleted successfully');
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
        />
        <button type="submit" disabled={!newChannelUrl.trim()}>
          + Add Channel
        </button>
      </form>

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

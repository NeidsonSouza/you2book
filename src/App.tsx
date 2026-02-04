import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [channels, setChannels] = useState<Array<Schema["Channel"]["type"]>>([]);
  const [newChannelUrl, setNewChannelUrl] = useState("");

  useEffect(() => {
    client.models.Channel.observeQuery().subscribe({
      next: (data) => setChannels([...data.items]),
    });
  }, []);

  function createChannel() {
    if (newChannelUrl.trim()) {
      client.models.Channel.create({ url: newChannelUrl.trim() });
      setNewChannelUrl("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createChannel();
  }

  function handleDeleteClick(id: string) {
    if (window.confirm("Are you sure you want to delete this channel item?")) {
      client.models.Channel.delete({ id });
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
            <span className="channel-content">{channel.url}</span>
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

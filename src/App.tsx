import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [channels, setChannels] = useState<Array<Schema["Channel"]["type"]>>([]);

  useEffect(() => {
    client.models.Channel.observeQuery().subscribe({
      next: (data) => setChannels([...data.items]),
    });
  }, []);

  function createChannel() {
    client.models.Channel.create({ url: window.prompt("Channel content") });
  }

  function handleDeleteClick(id: string) {
    if (window.confirm("Are you sure you want to delete this channel item?")) {
      client.models.Channel.delete({ id });
    }
  }

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Channels</h1>
      <button onClick={createChannel}>+ new</button>
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

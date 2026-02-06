import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import VideoItem from "./VideoItem";

const client = generateClient<Schema>();

interface VideoListProps {
  channelId: string;
}

function VideoList({ channelId }: VideoListProps) {
  const [videos, setVideos] = useState<Array<Schema["Video"]["type"]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when channelId changes
    let isSubscribed = true;

    // Use observeQuery for real-time updates
    const subscription = client.models.Video.observeQuery({
      filter: {
        channelId: {
          eq: channelId
        }
      }
    }).subscribe({
      next: (data) => {
        if (isSubscribed) {
          setVideos([...data.items]);
          setLoading(false);
          setError(null);
        }
      },
      error: (err) => {
        if (isSubscribed) {
          console.error('Error fetching videos:', err);
          setError('Failed to load videos. Please try again.');
          setLoading(false);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [channelId]);

  if (loading) {
    return (
      <div className="video-list-loading">
        <p>Loading videos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-list-error">
        <p>{error}</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="video-list-empty">
        <p>No videos found for this channel.</p>
        <p className="hint">Videos will appear here after fetching from YouTube.</p>
      </div>
    );
  }

  return (
    <div className="video-list">
      <h2>Videos ({videos.length})</h2>
      <div className="video-grid">
        {videos.map((video) => (
          <VideoItem key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}

export default VideoList;

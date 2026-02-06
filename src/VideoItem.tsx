import type { Schema } from "../amplify/data/resource";

interface VideoItemProps {
  video: Schema["Video"]["type"];
}

function VideoItem({ video }: VideoItemProps) {
  // Format ISO 8601 duration (PT4M13S) to readable format
  const formatDuration = (duration: string | null | undefined): string => {
    if (!duration) return 'Unknown';
    
    try {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return duration;

      const hours = parseInt(match[1] || '0');
      const minutes = parseInt(match[2] || '0');
      const seconds = parseInt(match[3] || '0');

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

      return parts.join(' ');
    } catch {
      return duration;
    }
  };

  return (
    <div className="video-item">
      <div className="video-header">
        <h3 className="video-title">{video.title}</h3>
        <span className="video-duration">{formatDuration(video.duration)}</span>
      </div>
      {video.description && (
        <p className="video-description">
          {video.description.length > 150 
            ? `${video.description.substring(0, 150)}...` 
            : video.description}
        </p>
      )}
    </div>
  );
}

export default VideoItem;

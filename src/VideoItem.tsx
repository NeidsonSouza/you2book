import { formatDuration } from './lib/utils';
import type { Video } from './types';

interface VideoItemProps {
  video: Video;
}

function VideoItem({ video }: VideoItemProps): React.JSX.Element {

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

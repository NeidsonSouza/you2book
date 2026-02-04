import { useParams, useNavigate } from 'react-router-dom';

function ChannelDetail() {
  const { channelUrl } = useParams<{ channelUrl: string }>();
  const navigate = useNavigate();

  const decodedUrl = channelUrl ? decodeURIComponent(channelUrl) : '';

  return (
    <main>
      <button 
        onClick={() => navigate('/')} 
        className="back-button"
      >
        ← Back to Channels
      </button>
      <h1>{decodedUrl}</h1>
    </main>
  );
}

export default ChannelDetail;
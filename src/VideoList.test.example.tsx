/**
 * Example usage of VideoList component
 * 
 * This file demonstrates how to integrate the VideoList component
 * into your application. To use it:
 * 
 * 1. Import the component:
 *    import VideoList from './VideoList';
 * 
 * 2. Use it in your component with a channelId:
 *    <VideoList channelId={channel.id} />
 * 
 * Example integration in ChannelDetail.tsx:
 * 
 * import VideoList from './VideoList';
 * 
 * function ChannelDetail() {
 *   const { channelUrl } = useParams();
 *   const [channel, setChannel] = useState(null);
 * 
 *   useEffect(() => {
 *     // Fetch channel by URL to get the ID
 *     client.models.Channel.list({
 *       filter: { url: { eq: channelUrl } }
 *     }).then(result => {
 *       if (result.data.length > 0) {
 *         setChannel(result.data[0]);
 *       }
 *     });
 *   }, [channelUrl]);
 * 
 *   return (
 *     <div>
 *       <h1>{channel?.name}</h1>
 *       {channel && <VideoList channelId={channel.id} />}
 *     </div>
 *   );
 * }
 * 
 * The VideoList component will:
 * - Display a loading state while fetching videos
 * - Show an error message if fetching fails
 * - Display "No videos found" if the channel has no videos
 * - Render a grid of video cards with title, description, and duration
 * - Automatically update in real-time when videos are added/removed
 */

export {};

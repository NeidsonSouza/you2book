import { useParams, useNavigate } from 'react-router-dom';

import { formatDate } from './lib/utils';
import { useChannelEbooks } from './hooks/useChannelEbooks';

function ChannelDetail(): React.JSX.Element {
  const { channelUrl } = useParams<{ channelUrl: string }>();
  const navigate = useNavigate();

  const decodedUrl = channelUrl ? decodeURIComponent(channelUrl) : '';
  const channelId = decodedUrl;
  
  // Use custom hook for data fetching
  const { ebooks, loading, error } = useChannelEbooks(channelId);
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Channels
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Generated Ebooks
              <span className="text-lg font-normal text-gray-500 ml-2">
                (from {decodedUrl})
              </span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error state */}
        {error && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div 
                className="text-lg text-red-600 font-medium"
                role="alert"
              >
                {error}
              </div>
            </div>
          </div>
        )}
        
        {/* Loading state */}
        {!error && loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="text-lg text-gray-600 font-medium">
                Loading ebooks...
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state - check if ebooks.length === 0 */}
        {!error && !loading && ebooks.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            No ebooks yet for this channel…
          </div>
        )}
        
        {/* Ebook cards - render when we have ebooks */}
        {!error && !loading && ebooks.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {ebooks.map((ebook) => (
              <div 
                key={ebook.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {ebook.title}
                </h2>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Pages:</span> {ebook.pageCount}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Generated:</span> {formatDate(ebook.generatedDate)}
                  </p>
                </div>
                
                {/* Source videos */}
                {ebook.sourceVideos && ebook.sourceVideos.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Source Videos:
                    </h3>
                    <ul className="space-y-1">
                      {ebook.sourceVideos.map((video) => (
                        <li key={video.id} className="text-sm">
                          <a 
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {video.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Download button */}
                <a
                  href={ebook.pdfUrl}
                  download
                  className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
                >
                  Download PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ChannelDetail;

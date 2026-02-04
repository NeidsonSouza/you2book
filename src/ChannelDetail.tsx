import { useParams, useNavigate } from 'react-router-dom';

// Fake ebook data for demonstration
const fakeEbooks = [
  {
    id: '1',
    title: 'Introduction to Machine Learning Basics',
    pageCount: 45,
    generatedDate: new Date('2026-02-03'),
    pdfUrl: '/downloads/ebook-123.pdf',
    sourceVideos: [
      { title: 'What is Machine Learning? (Andrew Ng)', url: 'https://youtube.com/watch?v=abc123' },
      { title: 'ML Basics: Supervised vs Unsupervised', url: 'https://youtube.com/watch?v=xyz789' }
    ]
  },
  {
    id: '2',
    title: 'Advanced Deep Learning Techniques',
    pageCount: 78,
    generatedDate: new Date('2026-02-01'),
    pdfUrl: '/downloads/ebook-456.pdf',
    sourceVideos: [
      { title: 'Neural Networks Explained', url: 'https://youtube.com/watch?v=def456' },
      { title: 'Backpropagation Algorithm', url: 'https://youtube.com/watch?v=ghi789' },
      { title: 'CNN vs RNN Comparison', url: 'https://youtube.com/watch?v=jkl012' }
    ]
  },
  {
    id: '3',
    title: 'Python for Data Science',
    pageCount: 62,
    generatedDate: new Date('2026-01-28'),
    pdfUrl: '/downloads/ebook-789.pdf',
    sourceVideos: [
      { title: 'Pandas Tutorial Complete Guide', url: 'https://youtube.com/watch?v=mno345' },
      { title: 'NumPy Arrays Masterclass', url: 'https://youtube.com/watch?v=pqr678' }
    ]
  },
  {
    id: '4',
    title: 'Web Development with React',
    pageCount: 91,
    generatedDate: new Date('2026-01-25'),
    pdfUrl: '/downloads/ebook-101.pdf',
    sourceVideos: [
      { title: 'React Hooks Deep Dive', url: 'https://youtube.com/watch?v=stu901' },
      { title: 'State Management Patterns', url: 'https://youtube.com/watch?v=vwx234' },
      { title: 'React Performance Optimization', url: 'https://youtube.com/watch?v=yza567' }
    ]
  }
];

function ChannelDetail() {
  const { channelUrl } = useParams<{ channelUrl: string }>();
  const navigate = useNavigate();

  const decodedUrl = channelUrl ? decodeURIComponent(channelUrl) : '';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

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
        {fakeEbooks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No ebooks yet for this channel…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fakeEbooks.map((ebook) => (
              <div key={ebook.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
                {/* Title area */}
                <div className="p-5 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {ebook.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    ~{ebook.pageCount} pages • Generated on {formatDate(ebook.generatedDate)}
                  </p>
                </div>
                
                {/* Sources */}
                <div className="px-5 py-3 bg-gray-50 text-sm text-gray-600 border-b border-gray-100">
                  <p className="font-medium mb-1">From videos:</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {ebook.sourceVideos.map((video, index) => (
                      <li key={index}>
                        <a 
                          href={video.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {video.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Download CTA */}
                <div className="p-5 mt-auto">
                  <a 
                    href={ebook.pdfUrl} 
                    className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md text-center transition"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ChannelDetail;
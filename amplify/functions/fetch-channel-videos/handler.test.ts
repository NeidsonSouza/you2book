import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import axios from 'axios';

/**
 * Extracts the YouTube channel ID from various URL formats
 * Supports: /channel/{ID}, /@{handle}, /c/{custom}, /user/{username}
 * @param url The YouTube channel URL
 * @returns The extracted channel ID or handle
 * @throws Error if the URL format is invalid
 */
function extractChannelId(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Validate it's a YouTube URL
    if (!urlObj.hostname.includes('youtube.com')) {
      throw new Error("Not a valid YouTube URL");
    }
    
    const pathname = urlObj.pathname;
    
    // Handle /channel/{CHANNEL_ID} format
    const channelMatch = pathname.match(/^\/channel\/([^\/]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }
    
    // Handle /@{HANDLE} format
    const handleMatch = pathname.match(/^\/@([^\/]+)/);
    if (handleMatch) {
      return `@${handleMatch[1]}`;
    }
    
    // Handle /c/{CUSTOM_URL} format
    const customMatch = pathname.match(/^\/c\/([^\/]+)/);
    if (customMatch) {
      return customMatch[1];
    }
    
    // Handle /user/{USERNAME} format
    const userMatch = pathname.match(/^\/user\/([^\/]+)/);
    if (userMatch) {
      return userMatch[1];
    }
    
    throw new Error("URL does not match any supported YouTube channel format");
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Invalid YouTube channel URL format");
    }
    throw error;
  }
}

/**
 * Fetches all videos from a YouTube channel with pagination
 * @param channelId The YouTube channel ID
 * @param apiKey The YouTube API key
 * @returns Array of video metadata objects
 * @throws Error if API calls fail
 */
async function fetchAllVideos(channelId: string, apiKey: string): Promise<Array<{
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}>> {
  const allVideos: Array<{
    youtubeId: string;
    title: string;
    description: string;
    duration: string;
  }> = [];
  let nextPageToken: string | undefined = undefined;
  
  // Paginate through all videos
  do {
    // Step 1: Get video IDs from search.list
    const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
    const searchParams: any = {
      part: 'id',
      channelId: channelId,
      type: 'video',
      maxResults: 50,
      order: 'date',
      key: apiKey
    };
    
    if (nextPageToken) {
      searchParams.pageToken = nextPageToken;
    }
    
    const searchResponse = await axios.get(searchUrl, { params: searchParams });
    
    if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
      break; // No more videos
    }
    
    // Extract video IDs
    const videoIds = searchResponse.data.items
      .map((item: any) => item.id.videoId)
      .filter((id: string) => id); // Filter out any undefined IDs
    
    if (videoIds.length === 0) {
      break;
    }
    
    // Step 2: Get video details from videos.list
    const videosUrl = 'https://www.googleapis.com/youtube/v3/videos';
    const videosParams = {
      part: 'snippet,contentDetails',
      id: videoIds.join(','),
      key: apiKey
    };
    
    const videosResponse = await axios.get(videosUrl, { params: videosParams });
    
    if (videosResponse.data.items) {
      for (const item of videosResponse.data.items) {
        allVideos.push({
          youtubeId: item.id,
          title: item.snippet.title,
          description: item.snippet.description || '',
          duration: item.contentDetails.duration
        });
      }
    }
    
    // Get next page token
    nextPageToken = searchResponse.data.nextPageToken;
    
  } while (nextPageToken);
  
  return allVideos;
}

describe('extractChannelId', () => {
  // Feature: fetch-channel-videos-refactor, Property 1: URL Parsing Extracts Channel ID
  // Validates: Requirements 4.2
  test('Property 1: URL Parsing Extracts Channel ID - extracts non-empty channel IDs from all valid URL formats', () => {
    // Custom arbitrary for generating valid YouTube channel URLs
    const youtubeChannelUrlArbitrary = fc.oneof(
      // /channel/{CHANNEL_ID} format
      fc.record({
        protocol: fc.constant('https:'),
        hostname: fc.constantFrom('www.youtube.com', 'youtube.com', 'm.youtube.com'),
        channelId: fc.string({ minLength: 10, maxLength: 30 }).filter(s => /^[A-Za-z0-9_-]+$/.test(s))
      }).map(({ protocol, hostname, channelId }) => ({
        url: `${protocol}//${hostname}/channel/${channelId}`,
        expectedId: channelId
      })),
      
      // /@{HANDLE} format
      fc.record({
        protocol: fc.constant('https:'),
        hostname: fc.constantFrom('www.youtube.com', 'youtube.com', 'm.youtube.com'),
        handle: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[A-Za-z0-9_]+$/.test(s))
      }).map(({ protocol, hostname, handle }) => ({
        url: `${protocol}//${hostname}/@${handle}`,
        expectedId: `@${handle}`
      })),
      
      // /c/{CUSTOM_URL} format
      fc.record({
        protocol: fc.constant('https:'),
        hostname: fc.constantFrom('www.youtube.com', 'youtube.com', 'm.youtube.com'),
        customUrl: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[A-Za-z0-9_-]+$/.test(s))
      }).map(({ protocol, hostname, customUrl }) => ({
        url: `${protocol}//${hostname}/c/${customUrl}`,
        expectedId: customUrl
      })),
      
      // /user/{USERNAME} format
      fc.record({
        protocol: fc.constant('https:'),
        hostname: fc.constantFrom('www.youtube.com', 'youtube.com', 'm.youtube.com'),
        username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[A-Za-z0-9_]+$/.test(s))
      }).map(({ protocol, hostname, username }) => ({
        url: `${protocol}//${hostname}/user/${username}`,
        expectedId: username
      }))
    );

    fc.assert(
      fc.property(
        youtubeChannelUrlArbitrary,
        ({ url, expectedId }) => {
          const extractedId = extractChannelId(url);
          
          // Verify the extracted ID is non-empty
          expect(extractedId).toBeTruthy();
          expect(extractedId.length).toBeGreaterThan(0);
          
          // Verify the extracted ID matches what we expect
          expect(extractedId).toBe(expectedId);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('fetchAllVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: fetch-channel-videos-refactor, Property 6: Pagination Completeness
  // Validates: Requirements 4.4
  test('Property 6: Pagination Completeness - fetches all videos across multiple pages', async () => {
    // Generator for pagination scenarios (2-5 pages with varying video counts)
    const paginationScenarioArbitrary = fc.record({
      channelId: fc.string({ minLength: 20, maxLength: 30 }).filter(s => /^[A-Za-z0-9_-]+$/.test(s)),
      apiKey: fc.string({ minLength: 30, maxLength: 40 }),
      numPages: fc.integer({ min: 2, max: 5 }),
      videosPerPage: fc.integer({ min: 10, max: 50 })
    }).chain(({ channelId, apiKey, numPages, videosPerPage }) => {
      const totalVideos = numPages * videosPerPage;
      
      // Generate unique video IDs using indices
      return fc.constant({
        channelId,
        apiKey,
        numPages,
        videosPerPage,
        allVideos: Array.from({ length: totalVideos }, (_, i) => ({
          youtubeId: `video_${i.toString().padStart(6, '0')}`,
          title: `Video Title ${i}`,
          description: `Description for video ${i}`,
          duration: ['PT1M30S', 'PT5M45S', 'PT10M20S', 'PT15M00S'][i % 4]
        }))
      });
    });

    await fc.assert(
      fc.asyncProperty(
        paginationScenarioArbitrary,
        async ({ channelId, apiKey, numPages, videosPerPage, allVideos }) => {
          // Mock axios.get to simulate paginated API responses
          const axiosGetSpy = vi.spyOn(axios, 'get');
          
          let searchCallCount = 0;
          let videosCallCount = 0;

          axiosGetSpy.mockImplementation(async (url: string, config?: any) => {
            const urlStr = typeof url === 'string' ? url : url.toString();
            
            // Mock search.list API (returns video IDs with pagination)
            if (urlStr.includes('/search')) {
              const pageToken = config?.params?.pageToken;
              const pageIndex = pageToken ? parseInt(pageToken.replace('page', '')) : 0;
              
              searchCallCount++;
              
              // Calculate which videos belong to this page
              const startIdx = pageIndex * videosPerPage;
              const endIdx = Math.min(startIdx + videosPerPage, allVideos.length);
              const pageVideos = allVideos.slice(startIdx, endIdx);
              
              // Determine if there's a next page
              const hasNextPage = endIdx < allVideos.length;
              const nextPageToken = hasNextPage ? `page${pageIndex + 1}` : undefined;
              
              return {
                data: {
                  items: pageVideos.map(v => ({
                    id: { videoId: v.youtubeId }
                  })),
                  nextPageToken
                }
              };
            }
            
            // Mock videos.list API (returns video details)
            if (urlStr.includes('/videos')) {
              videosCallCount++;
              
              const videoIds = config?.params?.id?.split(',') || [];
              const requestedVideos = allVideos.filter(v => videoIds.includes(v.youtubeId));
              
              return {
                data: {
                  items: requestedVideos.map(v => ({
                    id: v.youtubeId,
                    snippet: {
                      title: v.title,
                      description: v.description
                    },
                    contentDetails: {
                      duration: v.duration
                    }
                  }))
                }
              };
            }
            
            throw new Error(`Unexpected URL: ${urlStr}`);
          });

          // Call fetchAllVideos
          const result = await fetchAllVideos(channelId, apiKey);
          
          // Verify all videos were fetched
          expect(result).toHaveLength(allVideos.length);
          
          // Verify each video is present in the result
          for (const expectedVideo of allVideos) {
            const foundVideo = result.find(v => v.youtubeId === expectedVideo.youtubeId);
            expect(foundVideo).toBeDefined();
            expect(foundVideo?.title).toBe(expectedVideo.title);
            expect(foundVideo?.description).toBe(expectedVideo.description);
            expect(foundVideo?.duration).toBe(expectedVideo.duration);
          }
          
          // Verify the correct number of API calls were made
          expect(searchCallCount).toBe(numPages);
          expect(videosCallCount).toBe(numPages);
          
          axiosGetSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: fetch-channel-videos-refactor, Property 4: Video Metadata Completeness
  // Validates: Requirements 4.5, 5.7
  test('Property 4: Video Metadata Completeness - all fetched videos have required fields', async () => {
    // Generator for video metadata scenarios
    const videoMetadataScenarioArbitrary = fc.record({
      channelId: fc.string({ minLength: 20, maxLength: 30 }).filter(s => /^[A-Za-z0-9_-]+$/.test(s)),
      apiKey: fc.string({ minLength: 30, maxLength: 40 }),
      numVideos: fc.integer({ min: 1, max: 100 })
    }).chain(({ channelId, apiKey, numVideos }) => {
      // Generate random video data with all required fields
      return fc.constant({
        channelId,
        apiKey,
        videos: Array.from({ length: numVideos }, (_, i) => ({
          youtubeId: fc.sample(fc.string({ minLength: 11, maxLength: 11 }).filter(s => /^[A-Za-z0-9_-]+$/.test(s)), 1)[0],
          title: fc.sample(fc.string({ minLength: 5, maxLength: 100 }), 1)[0],
          description: fc.sample(fc.oneof(
            fc.string({ minLength: 0, maxLength: 500 }),
            fc.constant('')
          ), 1)[0],
          duration: fc.sample(fc.constantFrom('PT1M30S', 'PT5M45S', 'PT10M20S', 'PT15M00S', 'PT30M15S', 'PT1H5M30S'), 1)[0]
        }))
      });
    });

    await fc.assert(
      fc.asyncProperty(
        videoMetadataScenarioArbitrary,
        async ({ channelId, apiKey, videos }) => {
          // Mock axios.get to return the generated video data
          const axiosGetSpy = vi.spyOn(axios, 'get');
          
          axiosGetSpy.mockImplementation(async (url: string, config?: any) => {
            const urlStr = typeof url === 'string' ? url : url.toString();
            
            // Mock search.list API
            if (urlStr.includes('/search')) {
              return {
                data: {
                  items: videos.map(v => ({
                    id: { videoId: v.youtubeId }
                  })),
                  nextPageToken: undefined // Single page for simplicity
                }
              };
            }
            
            // Mock videos.list API
            if (urlStr.includes('/videos')) {
              const videoIds = config?.params?.id?.split(',') || [];
              const requestedVideos = videos.filter(v => videoIds.includes(v.youtubeId));
              
              return {
                data: {
                  items: requestedVideos.map(v => ({
                    id: v.youtubeId,
                    snippet: {
                      title: v.title,
                      description: v.description
                    },
                    contentDetails: {
                      duration: v.duration
                    }
                  }))
                }
              };
            }
            
            throw new Error(`Unexpected URL: ${urlStr}`);
          });

          // Call fetchAllVideos
          const result = await fetchAllVideos(channelId, apiKey);
          
          // Verify all videos have required fields
          expect(result).toHaveLength(videos.length);
          
          for (const video of result) {
            // Verify youtubeId is present and non-empty
            expect(video.youtubeId).toBeDefined();
            expect(video.youtubeId).toBeTruthy();
            expect(typeof video.youtubeId).toBe('string');
            expect(video.youtubeId.length).toBeGreaterThan(0);
            
            // Verify title is present and non-empty
            expect(video.title).toBeDefined();
            expect(typeof video.title).toBe('string');
            expect(video.title.length).toBeGreaterThan(0);
            
            // Verify description is present (can be empty string)
            expect(video.description).toBeDefined();
            expect(typeof video.description).toBe('string');
            
            // Verify duration is present and non-empty
            expect(video.duration).toBeDefined();
            expect(video.duration).toBeTruthy();
            expect(typeof video.duration).toBe('string');
            expect(video.duration.length).toBeGreaterThan(0);
          }
          
          axiosGetSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});

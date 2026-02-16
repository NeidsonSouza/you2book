import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import axios from 'axios';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

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
      { numRuns: 20 }
    );
  });
});

/**
 * Upserts a channel record in the database
 * Creates a new channel if it doesn't exist, updates if it does
 * @param channelData Channel information from YouTube
 * @param owner Cognito user ID
 * @param client Amplify Data client
 * @returns The channel ID
 */
async function upsertChannel(
  channelData: { name: string; url: string; youtubeChannelId: string },
  owner: string,
  client: ReturnType<typeof generateClient<Schema>>
): Promise<string> {
  // Query for existing channel by youtubeChannelId
  const existingChannels = await client.models.Channel.list({
    filter: { 
      youtubeChannelId: { eq: channelData.youtubeChannelId },
      owner: { eq: owner }
    }
  });
  
  if (existingChannels.data && existingChannels.data.length > 0) {
    // Update existing channel name
    const channelId = existingChannels.data[0].id;
    await client.models.Channel.update({
      id: channelId,
      name: channelData.name,
    });
    
    return channelId;
  } else {
    // Create new channel
    const result = await client.models.Channel.create({
      name: channelData.name,
      url: channelData.url,
      youtubeChannelId: channelData.youtubeChannelId,
      owner: owner,
    });
    
    if (!result.data) {
      throw new Error('Failed to create channel - no data returned');
    }
    
    return result.data.id;
  }
}

describe('upsertChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: fetch-channel-videos-refactor, Property 2: Channel Creation Completeness
  // Validates: Requirements 3.2, 5.2
  test('Property 2: Channel Creation Completeness - new channels have all required fields', async () => {
    // Simplified generator for new channel scenarios
    const newChannelScenarioArbitrary = fc.record({
      youtubeChannelId: fc.hexaString({ minLength: 24, maxLength: 24 }),
      channelName: fc.string({ minLength: 5, maxLength: 50 }),
      channelUrl: fc.constant('https://youtube.com/channel/test'),
      owner: fc.uuid()
    });

    await fc.assert(
      fc.asyncProperty(
        newChannelScenarioArbitrary,
        async ({ youtubeChannelId, channelName, channelUrl, owner }) => {
          const mockChannelId = fc.sample(fc.uuid(), 1)[0];
          
          const mockClient = {
            models: {
              Channel: {
                list: vi.fn().mockResolvedValue({ data: [] }),
                create: vi.fn().mockResolvedValue({
                  data: {
                    id: mockChannelId,
                    name: channelName,
                    url: channelUrl,
                    youtubeChannelId: youtubeChannelId,
                    owner: owner
                  }
                }),
                update: vi.fn()
              }
            }
          } as any;

          const channelId = await upsertChannel(
            { name: channelName, url: channelUrl, youtubeChannelId },
            owner,
            mockClient
          );

          expect(mockClient.models.Channel.create).toHaveBeenCalledTimes(1);
          const createCall = mockClient.models.Channel.create.mock.calls[0][0];
          
          expect(createCall.name).toBe(channelName);
          expect(createCall.url).toBe(channelUrl);
          expect(createCall.youtubeChannelId).toBe(youtubeChannelId);
          expect(createCall.owner).toBe(owner);
          expect(channelId).toBeTruthy();
        }
      ),
      { numRuns: 5 }
    );
  });

  // Feature: fetch-channel-videos-refactor, Property 3: Channel Update Preserves Identity
  // Validates: Requirements 5.3
  test('Property 3: Channel Update Preserves Identity - existing channel updates preserve ID', async () => {
    // Simplified generator for existing channel update scenarios
    const existingChannelScenarioArbitrary = fc.record({
      existingChannelId: fc.uuid(),
      youtubeChannelId: fc.hexaString({ minLength: 24, maxLength: 24 }),
      newChannelName: fc.string({ minLength: 5, maxLength: 50 }),
      channelUrl: fc.constant('https://youtube.com/channel/test'),
      owner: fc.uuid()
    });

    await fc.assert(
      fc.asyncProperty(
        existingChannelScenarioArbitrary,
        async ({ existingChannelId, youtubeChannelId, newChannelName, channelUrl, owner }) => {
          const existingChannel = {
            id: existingChannelId,
            name: 'Old Name',
            url: channelUrl,
            youtubeChannelId: youtubeChannelId,
            owner: owner
          };

          const mockClient = {
            models: {
              Channel: {
                list: vi.fn().mockResolvedValue({ data: [existingChannel] }),
                create: vi.fn(),
                update: vi.fn().mockResolvedValue({ data: { ...existingChannel, name: newChannelName } })
              }
            }
          } as any;

          const returnedChannelId = await upsertChannel(
            { name: newChannelName, url: channelUrl, youtubeChannelId },
            owner,
            mockClient
          );

          expect(mockClient.models.Channel.update).toHaveBeenCalledTimes(1);
          expect(returnedChannelId).toBe(existingChannelId);
          
          const updateCall = mockClient.models.Channel.update.mock.calls[0][0];
          expect(updateCall.id).toBe(existingChannelId);
          expect(updateCall.name).toBe(newChannelName);
        }
      ),
      { numRuns: 5 }
    );
  });
});

/**
 * Saves videos to the database with deduplication
 * @param videos Array of video metadata objects
 * @param channelId The channel ID to associate videos with
 * @param owner The Cognito user ID (owner)
 * @param client Amplify Data client
 * @returns Object with counts of saved and skipped videos
 */
async function saveVideos(
  videos: Array<{
    youtubeId: string;
    title: string;
    description: string;
    duration: string;
  }>,
  channelId: string,
  owner: string,
  client: ReturnType<typeof generateClient<Schema>>
): Promise<{ saved: number; skipped: number; failed: number }> {
  let savedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (const video of videos) {
    try {
      // Query for existing video by youtubeId
      const existingVideos = await client.models.Video.list({
        filter: { 
          youtubeId: { eq: video.youtubeId },
          owner: { eq: owner }
        }
      });
      
      if (existingVideos.data && existingVideos.data.length > 0) {
        // Video already exists, skip it
        skippedCount++;
        continue;
      }
      
      // Create new video
      const result = await client.models.Video.create({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        channelId: channelId,
        owner: owner,
      });
      
      if (result.data) {
        savedCount++;
      } else {
        failedCount++;
      }
    } catch (error) {
      // Handle individual save failures gracefully - log and continue
      failedCount++;
      // Continue processing remaining videos
    }
  }
  
  return { saved: savedCount, skipped: skippedCount, failed: failedCount };
}

describe('saveVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: fetch-channel-videos-refactor, Property 5: Video Deduplication (Idempotence)
  // Validates: Requirements 5.6
  test('Property 5: Video Deduplication (Idempotence) - running twice does not create duplicates', async () => {
    // Generator for video lists
    const videoListArbitrary = fc.array(
      fc.record({
        youtubeId: fc.hexaString({ minLength: 11, maxLength: 11 }),
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 0, maxLength: 200 }),
        duration: fc.constantFrom('PT1M30S', 'PT5M45S', 'PT10M20S', 'PT30M15S')
      }),
      { minLength: 1, maxLength: 10 }
    );

    const scenarioArbitrary = fc.record({
      videos: videoListArbitrary,
      channelId: fc.uuid(),
      owner: fc.uuid()
    });

    await fc.assert(
      fc.asyncProperty(
        scenarioArbitrary,
        async ({ videos, channelId, owner }) => {
          const createdVideos = new Map<string, any>();
          
          const mockClient = {
            models: {
              Video: {
                list: vi.fn().mockImplementation(({ filter }) => {
                  const youtubeId = filter.youtubeId.eq;
                  const existing = createdVideos.has(youtubeId) ? [createdVideos.get(youtubeId)] : [];
                  return Promise.resolve({ data: existing });
                }),
                create: vi.fn().mockImplementation((videoData) => {
                  const videoId = fc.sample(fc.uuid(), 1)[0];
                  const video = { id: videoId, ...videoData };
                  createdVideos.set(videoData.youtubeId, video);
                  return Promise.resolve({ data: video });
                })
              }
            }
          } as any;

          // First save
          const result1 = await saveVideos(videos, channelId, owner, mockClient);
          
          // Second save (should skip all videos)
          const result2 = await saveVideos(videos, channelId, owner, mockClient);

          // Verify first save created all videos
          expect(result1.saved).toBe(videos.length);
          expect(result1.skipped).toBe(0);
          
          // Verify second save skipped all videos (no duplicates created)
          expect(result2.saved).toBe(0);
          expect(result2.skipped).toBe(videos.length);
          
          // Verify each unique youtubeId appears exactly once
          expect(createdVideos.size).toBe(videos.length);
        }
      ),
      { numRuns: 10 }
    );
  });

  // Feature: fetch-channel-videos-refactor, Property 9: Error Resilience in Batch Operations
  // Validates: Requirements 5.8
  test('Property 9: Error Resilience in Batch Operations - partial failures do not stop processing', async () => {
    // Generator for mixed success/failure scenarios
    const videoListArbitrary = fc.array(
      fc.record({
        youtubeId: fc.hexaString({ minLength: 11, maxLength: 11 }),
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 0, maxLength: 200 }),
        duration: fc.constantFrom('PT1M30S', 'PT5M45S', 'PT10M20S'),
        shouldFail: fc.boolean()
      }),
      { minLength: 3, maxLength: 10 }
    );

    const scenarioArbitrary = fc.record({
      videos: videoListArbitrary,
      channelId: fc.uuid(),
      owner: fc.uuid()
    });

    await fc.assert(
      fc.asyncProperty(
        scenarioArbitrary,
        async ({ videos, channelId, owner }) => {
          const expectedSuccesses = videos.filter(v => !v.shouldFail).length;
          const expectedFailures = videos.filter(v => v.shouldFail).length;
          
          const mockClient = {
            models: {
              Video: {
                list: vi.fn().mockResolvedValue({ data: [] }),
                create: vi.fn().mockImplementation((videoData) => {
                  const video = videos.find(v => v.youtubeId === videoData.youtubeId);
                  if (video?.shouldFail) {
                    throw new Error('Simulated database error');
                  }
                  const videoId = fc.sample(fc.uuid(), 1)[0];
                  return Promise.resolve({ data: { id: videoId, ...videoData } });
                })
              }
            }
          } as any;

          const result = await saveVideos(
            videos.map(({ shouldFail, ...v }) => v),
            channelId,
            owner,
            mockClient
          );

          // Verify that successful videos were saved despite failures
          expect(result.saved).toBe(expectedSuccesses);
          expect(result.failed).toBe(expectedFailures);
          
          // Verify all videos were processed (saved + failed = total)
          expect(result.saved + result.failed).toBe(videos.length);
          
          // Verify create was called for each video (processing continued)
          expect(mockClient.models.Video.create).toHaveBeenCalledTimes(videos.length);
        }
      ),
      { numRuns: 10 }
    );
  });
});

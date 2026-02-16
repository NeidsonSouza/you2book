/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fetchVideosFromYouTube, type VideoMetadata } from './youtubeService';
import * as amplifyClient from '../lib/amplifyClient';

// Mock the amplify client
vi.mock('../lib/amplifyClient', () => ({
  client: {
    queries: {
      fetchChannelVideos: vi.fn(),
    },
  },
}));

describe('fetchVideosFromYouTube', () => {
  const mockClient = amplifyClient.client as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should successfully fetch videos from YouTube', async () => {
    const mockVideos: VideoMetadata[] = [
      {
        youtubeId: 'video1',
        title: 'Test Video 1',
        description: 'Description 1',
        duration: 'PT10M30S',
      },
      {
        youtubeId: 'video2',
        title: 'Test Video 2',
        description: 'Description 2',
        duration: 'PT5M15S',
      },
    ];

    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: {
        success: true,
        message: 'Videos fetched successfully',
        timestamp: '2024-01-01T00:00:00Z',
        videos: mockVideos,
      },
      errors: undefined,
    });

    const result = await fetchVideosFromYouTube('https://www.youtube.com/channel/UC123');

    expect(result).toEqual(mockVideos);
    expect(mockClient.queries.fetchChannelVideos).toHaveBeenCalledWith({
      channelUrl: 'https://www.youtube.com/channel/UC123',
    });
  });

  test('should throw error when query returns errors', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: null,
      errors: [
        { message: 'Invalid channel URL' },
        { message: 'API key not found' },
      ],
    });

    await expect(
      fetchVideosFromYouTube('https://www.youtube.com/channel/invalid')
    ).rejects.toThrow('Invalid channel URL, API key not found');
  });

  test('should throw error when no data is returned', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: null,
      errors: undefined,
    });

    await expect(
      fetchVideosFromYouTube('https://www.youtube.com/channel/UC123')
    ).rejects.toThrow('No data returned from query');
  });

  test('should throw error when success is false', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: {
        success: false,
        message: 'YouTube API error: Channel not found',
        timestamp: '2024-01-01T00:00:00Z',
        videos: [],
      },
      errors: undefined,
    });

    await expect(
      fetchVideosFromYouTube('https://www.youtube.com/channel/UC123')
    ).rejects.toThrow('YouTube API error: Channel not found');
  });

  test('should return empty array when videos is null', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: {
        success: true,
        message: 'No videos found',
        timestamp: '2024-01-01T00:00:00Z',
        videos: null,
      },
      errors: undefined,
    });

    const result = await fetchVideosFromYouTube('https://www.youtube.com/channel/UC123');

    expect(result).toEqual([]);
  });

  test('should return empty array when videos is not an array', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: {
        success: true,
        message: 'Invalid response',
        timestamp: '2024-01-01T00:00:00Z',
        videos: 'not an array' as any,
      },
      errors: undefined,
    });

    const result = await fetchVideosFromYouTube('https://www.youtube.com/channel/UC123');

    expect(result).toEqual([]);
  });

  test('should handle empty videos array', async () => {
    mockClient.queries.fetchChannelVideos.mockResolvedValue({
      data: {
        success: true,
        message: 'Channel has no videos',
        timestamp: '2024-01-01T00:00:00Z',
        videos: [],
      },
      errors: undefined,
    });

    const result = await fetchVideosFromYouTube('https://www.youtube.com/channel/UC123');

    expect(result).toEqual([]);
  });
});

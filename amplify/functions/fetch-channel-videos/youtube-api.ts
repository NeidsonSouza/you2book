// External libraries
import axios from "axios"

export interface YouTubeVideo {
  youtubeId: string
  title: string
  description: string
  duration: string
}

/**
 * Fetches channel metadata from YouTube API
 * @param channelId The YouTube channel ID or handle
 * @param apiKey The YouTube API key
 * @returns The channel name
 * @throws Error if the channel is not found or API call fails
 */
export async function fetchChannelMetadata(channelId: string, apiKey: string): Promise<string> {
  try {
    const baseUrl = 'https://www.googleapis.com/youtube/v3/channels'
    let params: Record<string, string>

    // Determine how to look up the channel based on identifier format
    // YouTube API requires different parameters for channel IDs vs handles vs usernames
    if (channelId.startsWith('UC')) {
      params = {
        part: 'snippet',
        id: channelId,
        key: apiKey
      }
    } else if (channelId.startsWith('@')) {
      params = {
        part: 'snippet',
        forHandle: channelId.substring(1),
        key: apiKey
      }
    } else {
      params = {
        part: 'snippet',
        forUsername: channelId,
        key: apiKey
      }
    }

    console.log(JSON.stringify({
      step: 'fetchChannelMetadata',
      channelId,
      status: 'requesting'
    }))
    const channelResponse = await axios.get(baseUrl, { params })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error(`fetchChannelMetadata: Channel not found (channelId=${channelId})`)
    }

    const channelName = channelResponse.data.items[0].snippet.title
    return channelName
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const errorData = error.response?.data

      console.error(JSON.stringify({
        step: 'fetchChannelMetadata',
        channelId,
        status: 'error',
        httpStatus: status,
        statusText: error.response?.statusText,
        errorData
      }))

      if (status === 404) {
        throw new Error(`fetchChannelMetadata: Channel not found (channelId=${channelId}, httpStatus=404)`)
      } else if (status === 403) {
        throw new Error('fetchChannelMetadata: YouTube API access forbidden - check API key and quota')
      } else if (status === 400) {
        const errorMessage = errorData?.error?.message || 'Invalid request'
        throw new Error(`fetchChannelMetadata: Bad request for channel ${channelId}: ${errorMessage}`)
      } else if (status && status >= 500) {
        throw new Error('fetchChannelMetadata: YouTube API service error - please try again later')
      }

      throw new Error(`fetchChannelMetadata: YouTube API error (channelId=${channelId}): ${error.message}`)
    }

    throw error
  }
}

/**
 * Fetches all videos from a YouTube channel with pagination
 * @param channelId The YouTube channel ID
 * @param apiKey The YouTube API key
 * @returns Array of video metadata objects
 * @throws Error if API calls fail
 */
export async function fetchAllVideos(channelId: string, apiKey: string): Promise<YouTubeVideo[]> {
  try {
    const allVideos: YouTubeVideo[] = []
    let nextPageToken: string | undefined = undefined

    // Resolve channelId to actual channel ID if needed
    // Channel IDs start with "UC" - other formats require API lookup first
    let actualChannelId = channelId

    if (!channelId.startsWith('UC')) {
      const channelsUrl = 'https://www.googleapis.com/youtube/v3/channels'
      let channelParams: Record<string, string>

      if (channelId.startsWith('@')) {
        channelParams = {
          part: 'id',
          forHandle: channelId.substring(1),
          key: apiKey
        }
      } else {
        channelParams = {
          part: 'id',
          forUsername: channelId,
          key: apiKey
        }
      }

      const channelResponse = await axios.get(channelsUrl, { params: channelParams })

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw new Error(`fetchAllVideos: Channel not found for identifier (channelId=${channelId})`)
      }

      actualChannelId = channelResponse.data.items[0].id
    }

    // Paginate through all videos using search.list + videos.list
    do {
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      const searchParams: Record<string, string | number> = {
        part: 'id',
        channelId: actualChannelId,
        type: 'video',
        maxResults: 50,
        order: 'date',
        key: apiKey
      }

      if (nextPageToken) {
        searchParams.pageToken = nextPageToken
      }

      const searchResponse = await axios.get(searchUrl, { params: searchParams })

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        break
      }

      // Extract video IDs for batch metadata fetch
      const videoIds = searchResponse.data.items
        .map((item: { id: { videoId: string } }) => item.id.videoId)
        .filter((id: string) => id)

      if (videoIds.length === 0) {
        break
      }

      // Fetch full metadata for all videos in this page
      const videosUrl = 'https://www.googleapis.com/youtube/v3/videos'
      const videosParams = {
        part: 'snippet,contentDetails',
        id: videoIds.join(','),
        key: apiKey
      }

      const videosResponse = await axios.get(videosUrl, { params: videosParams })

      if (videosResponse.data.items) {
        for (const videoItem of videosResponse.data.items) {
          allVideos.push({
            youtubeId: videoItem.id,
            title: videoItem.snippet.title,
            description: videoItem.snippet.description || '',
            duration: videoItem.contentDetails.duration
          })
        }
      }

      // Get next page token
      nextPageToken = searchResponse.data.nextPageToken

    } while (nextPageToken)

    return allVideos
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status

      if (status === 404) {
        throw new Error(`fetchAllVideos: Channel not found (channelId=${channelId}, httpStatus=404)`)
      } else if (status === 403) {
        throw new Error('fetchAllVideos: YouTube API access forbidden - check API key and quota')
      } else if (status === 400) {
        throw new Error(`fetchAllVideos: Invalid request parameters for channel (channelId=${channelId})`)
      } else if (status && status >= 500) {
        throw new Error('fetchAllVideos: YouTube API service error - please try again later')
      }

      throw new Error(`fetchAllVideos: YouTube API error (channelId=${channelId}): ${error.message}`)
    }

    throw error
  }
}

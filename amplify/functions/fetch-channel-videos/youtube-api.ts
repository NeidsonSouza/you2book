// External libraries
import axios from "axios"
import { google } from "googleapis"

// Local modules
import { stripSrtTimestamps } from "./srt-parser"

export interface YouTubeVideo {
  youtubeId: string
  title: string
  description: string
  duration: string
}

export interface CaptionTrack {
  id: string
  snippet: {
    language: string
    trackKind?: string
  }
}

/**
 * Selects the preferred caption track from an array of available tracks
 * Prefers English tracks, falls back to the first available track
 * @param tracks Array of caption track objects from YouTube API
 * @returns The preferred caption track, or null if the array is empty
 */
function selectCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  // Return null if no tracks available
  if (!tracks || tracks.length === 0) {
    return null
  }
  
  // Prefer English track
  const englishTrack = tracks.find(track => track.snippet.language === 'en')
  if (englishTrack) {
    return englishTrack
  }
  
  // Fallback to first available track
  return tracks[0]
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

    // Determine how to look up the channel based on the identifier format
    if (channelId.startsWith('UC')) {
      // It's already a channel ID
      params = {
        part: 'snippet',
        id: channelId,
        key: apiKey
      }
    } else if (channelId.startsWith('@')) {
      // It's a handle - use forHandle parameter (without the @ symbol)
      params = {
        part: 'snippet',
        forHandle: channelId.substring(1),
        key: apiKey
      }
    } else {
      // It's a custom URL or username - use forUsername parameter
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
    const response = await axios.get(baseUrl, { params })

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`fetchChannelMetadata: Channel not found (channelId=${channelId})`)
    }

    const channelName = response.data.items[0].snippet.title
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

    // Resolve channelId to actual channel ID if it's not already one
    let actualChannelId = channelId

    // Channel IDs start with "UC" - if it doesn't, we need to resolve it
    if (!channelId.startsWith('UC')) {
      const channelsUrl = 'https://www.googleapis.com/youtube/v3/channels'
      let channelParams: Record<string, string>

      if (channelId.startsWith('@')) {
        // It's a handle - use forHandle parameter (without the @ symbol)
        channelParams = {
          part: 'id',
          forHandle: channelId.substring(1),
          key: apiKey
        }
      } else {
        // It's a custom URL or username - use forUsername parameter
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

    // Paginate through all videos
    do {
      // Step 1: Get video IDs from search.list
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
        break // No more videos
      }

      // Extract video IDs
      const videoIds = searchResponse.data.items
        .map((item: { id: { videoId: string } }) => item.id.videoId)
        .filter((id: string) => id) // Filter out any undefined IDs

      if (videoIds.length === 0) {
        break
      }

      // Step 2: Get video details from videos.list
      const videosUrl = 'https://www.googleapis.com/youtube/v3/videos'
      const videosParams = {
        part: 'snippet,contentDetails',
        id: videoIds.join(','),
        key: apiKey
      }

      const videosResponse = await axios.get(videosUrl, { params: videosParams })

      if (videosResponse.data.items) {
        for (const item of videosResponse.data.items) {
          allVideos.push({
            youtubeId: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            duration: item.contentDetails.duration
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

/**
 * Fetches captions for a YouTube video and returns plain text transcript
 * @param videoYoutubeId The YouTube video ID
 * @param apiKey The YouTube API key
 * @returns Plain text transcript content, or null if no captions available or on error
 */
export async function fetchTranscript(videoYoutubeId: string, apiKey: string): Promise<string | null> {
  try {
    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      status: 'requesting'
    }))
    
    // Initialize YouTube API client
    const youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    })
    
    // Step 1: List available caption tracks
    const captionsListResponse = await youtube.captions.list({
      part: ['snippet'],
      videoId: videoYoutubeId
    })
    
    const tracks = captionsListResponse.data.items as CaptionTrack[] | undefined
    
    if (!tracks || tracks.length === 0) {
      console.log(JSON.stringify({
        step: 'fetchTranscript',
        videoYoutubeId,
        status: 'no_captions'
      }))
      return null
    }
    
    // Step 2: Select the best caption track
    const selectedTrack = selectCaptionTrack(tracks)
    
    if (!selectedTrack) {
      console.log(JSON.stringify({
        step: 'fetchTranscript',
        videoYoutubeId,
        status: 'no_suitable_track'
      }))
      return null
    }
    
    const language = selectedTrack.snippet.language
    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      language,
      status: 'downloading'
    }))
    
    // Step 3: Download the caption content in SRT format
    const captionDownloadResponse = await youtube.captions.download({
      id: selectedTrack.id,
      tfmt: 'srt'
    }, {
      responseType: 'text'
    })
    
    const srtContent = captionDownloadResponse.data as string
    
    // Step 4: Strip timestamps and convert to plain text
    const plainText = stripSrtTimestamps(srtContent)
    
    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      language,
      characters: plainText.length,
      status: 'success'
    }))
    
    return plainText
  } catch (error) {
    // Log error and return null - don't throw to allow processing to continue
    console.error(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return null
  }
}

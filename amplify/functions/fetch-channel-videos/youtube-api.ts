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

interface CaptionTrackInfo {
  baseUrl: string
  languageCode: string
}

interface CaptionsData {
  playerCaptionsTracklistRenderer?: {
    captionTracks?: CaptionTrackInfo[]
  }
}

/**
 * Downloads and parses a caption track from YouTube's timedtext endpoint
 * @param tracks Array of available caption tracks
 * @param videoYoutubeId The YouTube video ID (for logging)
 * @returns Plain text transcript, or null if download/parse fails
 */
async function downloadCaptionTrack(tracks: CaptionTrackInfo[], videoYoutubeId: string): Promise<string | null> {
  // Prefer English, fall back to first available track
  const selectedTrack = tracks.find((t: CaptionTrackInfo) => t.languageCode === 'en') ?? tracks[0]
  const language = selectedTrack.languageCode

  console.log(JSON.stringify({
    step: 'fetchTranscript',
    videoYoutubeId,
    language,
    status: 'downloading'
  }))

  // Fetch the transcript XML (fmt=srv3 gives XML with text nodes)
  const transcriptUrl = `${selectedTrack.baseUrl}&fmt=srv3`
  const transcriptResponse = await axios.get(transcriptUrl)
  const xmlContent: string = transcriptResponse.data

  // Extract plain text from the XML response
  // Each caption segment is in a <p> tag with text content
  const textSegments: string[] = []
  const segmentRegex = /<p[^>]*>(.*?)<\/p>/gs
  let match: RegExpExecArray | null
  while ((match = segmentRegex.exec(xmlContent)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, '')  // strip inner tags like <s>
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
    if (text) {
      textSegments.push(text)
    }
  }

  if (textSegments.length === 0) {
    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      status: 'empty_transcript'
    }))
    return null
  }

  const plainText = textSegments.join('\n')

  console.log(JSON.stringify({
    step: 'fetchTranscript',
    videoYoutubeId,
    language,
    characters: plainText.length,
    status: 'success'
  }))

  return plainText
}

/**
 * Fetches captions for a YouTube video using YouTube's public timedtext API.
 * This avoids the OAuth2 requirement of the official Captions.download endpoint.
 * @param videoYoutubeId The YouTube video ID
 * @param _apiKey The YouTube API key (unused — kept for interface compatibility)
 * @returns Plain text transcript content, or null if no captions available or on error
 */
export async function fetchTranscript(videoYoutubeId: string, _apiKey: string): Promise<string | null> {
  try {
    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      status: 'requesting'
    }))

    // Use YouTube's InnerTube API with the ANDROID client context.
    // The WEB client often omits captions in server-side requests, but
    // the ANDROID client reliably returns caption track metadata.
    const innertubeUrl = 'https://www.youtube.com/youtubei/v1/player'
    const playerResponse = await axios.post(innertubeUrl, {
      videoId: videoYoutubeId,
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.29.37',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip'
      }
    })

    const data = playerResponse.data as {
      captions?: CaptionsData
      playabilityStatus?: { status?: string; reason?: string }
    }

    console.log(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      playabilityStatus: data?.playabilityStatus?.status,
      hasCaptions: !!data?.captions,
      trackCount: data?.captions?.playerCaptionsTracklistRenderer?.captionTracks?.length ?? 0,
      status: 'innertube_response'
    }))

    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (!tracks || tracks.length === 0) {
      console.log(JSON.stringify({
        step: 'fetchTranscript',
        videoYoutubeId,
        status: 'no_captions',
        reason: 'no_caption_tracks'
      }))
      return null
    }

    return await downloadCaptionTrack(tracks, videoYoutubeId)
  } catch (error) {
    // Don't throw - allow video processing to continue even if transcript fails
    console.error(JSON.stringify({
      step: 'fetchTranscript',
      videoYoutubeId,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return null
  }
}

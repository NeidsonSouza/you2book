import type { Schema } from "../../data/resource"
import axios from "axios"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { env } from "$amplify/env/fetch-channel-videos"

// Configure Amplify for Lambda environment using the official helper
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

// Create the Amplify Data client
const client = generateClient<Schema>()

/**
 * Retrieves the YouTube API key from environment variables
 * @returns The YouTube API key
 * @throws Error if the API key is not configured
 */
function getYouTubeApiKey(): string {
  const apiKey = env.YOUTUBE_API_KEY
  
  if (!apiKey) {
    throw new Error("YouTube API key not configured")
  }
  
  return apiKey
}

/**
 * Extracts the YouTube channel ID from various URL formats
 * Supports: /channel/{ID}, /@{handle}, /c/{custom}, /user/{username}
 * @param url The YouTube channel URL
 * @returns The extracted channel ID or handle
 * @throws Error if the URL format is invalid
 */
function extractChannelId(url: string): string {
  try {
    const urlObj = new URL(url)
    
    // Validate it's a YouTube URL
    if (!urlObj.hostname.includes('youtube.com')) {
      throw new Error("Not a valid YouTube URL")
    }
    
    const pathname = urlObj.pathname
    
    // Handle /channel/{CHANNEL_ID} format
    const channelMatch = pathname.match(/^\/channel\/([^/]+)/)
    if (channelMatch) {
      return channelMatch[1]
    }
    
    // Handle /@{HANDLE} format
    const handleMatch = pathname.match(/^\/@([^/]+)/)
    if (handleMatch) {
      return `@${handleMatch[1]}`
    }
    
    // Handle /c/{CUSTOM_URL} format
    const customMatch = pathname.match(/^\/c\/([^/]+)/)
    if (customMatch) {
      return customMatch[1]
    }
    
    // Handle /user/{USERNAME} format
    const userMatch = pathname.match(/^\/user\/([^/]+)/)
    if (userMatch) {
      return userMatch[1]
    }
    
    throw new Error("URL does not match any supported YouTube channel format")
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Invalid YouTube channel URL format")
    }
    throw error
  }
}

/**
 * Fetches channel metadata from YouTube API
 * @param channelId The YouTube channel ID or handle
 * @param apiKey The YouTube API key
 * @returns The channel name
 * @throws Error if the channel is not found or API call fails
 */
async function fetchChannelMetadata(channelId: string, apiKey: string): Promise<string> {
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

    console.log('Fetching channel metadata with params:', params)
    const response = await axios.get(baseUrl, { params })

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`)
    }

    const channelName = response.data.items[0].snippet.title
    return channelName
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const errorData = error.response?.data

      console.error('YouTube API Error in fetchChannelMetadata:', {
        status,
        statusText: error.response?.statusText,
        data: errorData,
        url: error.config?.url,
        params: error.config?.params,
        channelId
      })

      if (status === 404) {
        throw new Error(`Channel not found: ${channelId}`)
      } else if (status === 403) {
        throw new Error('YouTube API access forbidden - check API key and quota')
      } else if (status === 400) {
        const errorMessage = errorData?.error?.message || 'Invalid request'
        throw new Error(`Bad request for channel ${channelId}: ${errorMessage}`)
      } else if (status && status >= 500) {
        throw new Error('YouTube API service error - please try again later')
      }

      throw new Error(`YouTube API error: ${error.message}`)
    }

    throw error
  }
}

interface YouTubeVideo {
  youtubeId: string
  title: string
  description: string
  duration: string
}

/**
 * Fetches all videos from a YouTube channel with pagination
 * @param channelId The YouTube channel ID
 * @param apiKey The YouTube API key
 * @returns Array of video metadata objects
 * @throws Error if API calls fail
 */
async function fetchAllVideos(channelId: string, apiKey: string): Promise<YouTubeVideo[]> {
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
        throw new Error(`Channel not found for identifier: ${channelId}`)
      }

      actualChannelId = channelResponse.data.items[0].id
    }

    // Paginate through all videos
    do {
      // Step 1: Get video IDs from search.list
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      const searchParams: Record<string, string | number> = {
        part: 'snippet',
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
        throw new Error(`Channel not found: ${channelId}`)
      } else if (status === 403) {
        throw new Error('YouTube API access forbidden - check API key and quota')
      } else if (status === 400) {
        throw new Error(`Invalid request parameters for channel: ${channelId}`)
      } else if (status && status >= 500) {
        throw new Error('YouTube API service error - please try again later')
      }

      throw new Error(`YouTube API error: ${error.message}`)
    }

    throw error
  }
}

/**
 * Creates or updates a channel record in the database
 * @param channelData Object containing channel information
 * @param owner The Cognito user ID (owner)
 * @returns The channel ID
 * @throws Error if database operations fail
 */
async function upsertChannel(
  channelData: { name: string; url: string; youtubeChannelId: string },
  owner: string
): Promise<string> {
  try {
    // Query for existing channel by youtubeChannelId
    console.log('Querying for existing channel:', { youtubeChannelId: channelData.youtubeChannelId, owner })
    const existingChannels = await client.models.Channel.list({
      filter: { 
        youtubeChannelId: { eq: channelData.youtubeChannelId },
        owner: { eq: owner }
      }
    })
    
    if (existingChannels.errors) {
      console.error('Channel list query errors:', JSON.stringify(existingChannels.errors))
      throw new Error('Failed to query channels: ' + existingChannels.errors.map(e => e.message).join(', '))
    }
    
    if (existingChannels.data && existingChannels.data.length > 0) {
      // Update existing channel name
      const channelId = existingChannels.data[0].id
      const updateResult = await client.models.Channel.update({
        id: channelId,
        name: channelData.name,
      })
      
      if (updateResult.errors) {
        console.error('Channel update errors:', JSON.stringify(updateResult.errors))
        throw new Error('Failed to update channel: ' + updateResult.errors.map(e => e.message).join(', '))
      }
      
      console.log(`Updated existing channel: ${channelId}`)
      return channelId
    } else {
      // Create new channel
      console.log('Creating new channel:', { ...channelData, owner })
      const result = await client.models.Channel.create({
        name: channelData.name,
        url: channelData.url,
        youtubeChannelId: channelData.youtubeChannelId,
        owner: owner,
      })
      
      if (result.errors) {
        console.error('Channel create errors:', JSON.stringify(result.errors))
        throw new Error('Failed to create channel: ' + result.errors.map(e => e.message).join(', '))
      }
      
      if (!result.data) {
        throw new Error('Failed to create channel - no data returned')
      }
      
      console.log(`Created new channel: ${result.data.id}`)
      return result.data.id
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Failed to upsert channel:', errorMessage)
    throw new Error(`Database error: ${errorMessage}`)
  }
}

/**
 * Saves videos to the database with deduplication
 * @param videos Array of video metadata objects
 * @param channelId The channel ID to associate videos with
 * @param owner The Cognito user ID (owner)
 * @returns Object with counts of saved and skipped videos
 * @throws Error if critical database operations fail
 */
async function saveVideos(
  videos: YouTubeVideo[],
  channelId: string,
  owner: string
): Promise<{ saved: number; skipped: number; failed: number }> {
  let savedCount = 0
  let skippedCount = 0
  let failedCount = 0
  
  for (const video of videos) {
    try {
      // Query for existing video by youtubeId
      const existingVideos = await client.models.Video.list({
        filter: { 
          youtubeId: { eq: video.youtubeId },
          owner: { eq: owner }
        }
      })
      
      if (existingVideos.data && existingVideos.data.length > 0) {
        // Video already exists, skip it
        skippedCount++
        console.log(`Skipped existing video: ${video.youtubeId}`)
        continue
      }
      
      // Create new video
      const result = await client.models.Video.create({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        channelId: channelId,
        owner: owner,
      })
      
      if (result.data) {
        savedCount++
        console.log(`Saved new video: ${video.youtubeId}`)
      } else {
        failedCount++
        console.error(`Failed to save video ${video.youtubeId}: No data returned`)
      }
    } catch (error) {
      // Handle individual save failures gracefully - log and continue
      failedCount++
      console.error(`Failed to save video ${video.youtubeId}:`, error)
      // Continue processing remaining videos
    }
  }
  
  return { saved: savedCount, skipped: skippedCount, failed: failedCount }
}

/**
 * Main handler function for fetching channel videos
 * Orchestrates the entire flow: API key retrieval → URL parsing → channel fetch → video fetch → database operations
 * @param event The Lambda event containing channelUrl and user identity
 * @returns Response object with success status, message, timestamp, and videos
 */
export const handler: Schema["fetchChannelVideos"]["functionHandler"] = async (event) => {
  // Generate ISO 8601 timestamp at the start
  const timestamp = new Date().toISOString()
  
  try {
    // Extract arguments and user identity
    const { channelUrl } = event.arguments
    const owner = event.identity && 'sub' in event.identity ? event.identity.sub : undefined
    
    // Validate user authentication
    if (!owner) {
      console.error("Authentication error: User identity not found")
      return {
        success: false,
        message: "User identity not found - authentication required",
        timestamp,
        videos: []
      }
    }
    
    console.log(`Processing channel URL: ${channelUrl} for user: ${owner}`)
    
    // Step 1: Get YouTube API key from environment
    let apiKey: string
    try {
      apiKey = getYouTubeApiKey()
    } catch (error) {
      console.error("API key configuration error:", error)
      return {
        success: false,
        message: "YouTube API key not configured. Please set the YOUTUBE_API_KEY secret.",
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 2: Parse URL to extract channel ID
    let channelId: string
    try {
      channelId = extractChannelId(channelUrl)
      console.log(`Extracted channel ID: ${channelId}`)
    } catch (error) {
      console.error("URL parsing error:", error)
      const errorMessage = error instanceof Error ? error.message : "Invalid URL format"
      return {
        success: false,
        message: `Invalid YouTube channel URL: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 3: Fetch channel metadata
    let channelName: string
    try {
      channelName = await fetchChannelMetadata(channelId, apiKey)
      console.log(`Fetched channel metadata: ${channelName}`)
    } catch (error) {
      console.error("Channel metadata fetch error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch channel metadata"
      return {
        success: false,
        message: `YouTube API error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 4: Fetch all videos from the channel
    let videos: YouTubeVideo[]
    try {
      console.log(`About to fetch videos for channelId: ${channelId}`)
      videos = await fetchAllVideos(channelId, apiKey)
      console.log(`Fetched ${videos.length} videos from channel`)
    } catch (error) {
      console.error("Video fetch error:", error)
      if (axios.isAxiosError(error)) {
        console.error("Axios error details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            params: error.config?.params
          }
        })
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch videos"
      return {
        success: false,
        message: `YouTube API error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 5: Upsert channel record in database
    let dbChannelId: string
    try {
      dbChannelId = await upsertChannel(
        {
          name: channelName,
          url: channelUrl,
          youtubeChannelId: channelId
        },
        owner
      )
      console.log(`Channel upserted with ID: ${dbChannelId}`)
    } catch (error) {
      console.error("Channel upsert error:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save channel"
      return {
        success: false,
        message: `Database error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 6: Save videos to database with deduplication
    let saveResults: { saved: number; skipped: number; failed: number }
    try {
      saveResults = await saveVideos(videos, dbChannelId, owner)
      console.log(`Video save results: ${JSON.stringify(saveResults)}`)
    } catch (error) {
      // This shouldn't happen as saveVideos handles errors internally
      console.error("Unexpected error in saveVideos:", error)
      saveResults = { saved: 0, skipped: 0, failed: videos.length }
    }
    
    // Build success response with descriptive message
    const message = `Successfully fetched ${videos.length} videos from channel "${channelName}". ` +
      `Saved: ${saveResults.saved}, Skipped (duplicates): ${saveResults.skipped}, Failed: ${saveResults.failed}`
    
    return {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      videos: videos.map(v => ({
        youtubeId: v.youtubeId,
        title: v.title,
        description: v.description,
        duration: v.duration
      }))
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error("Unexpected handler error:", error)
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
    
    return {
      success: false,
      message: `Failed to fetch channel videos: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      videos: []
    }
  }
}

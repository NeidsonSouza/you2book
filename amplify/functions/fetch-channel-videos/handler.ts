import type { Schema } from "../../data/resource"
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"
import axios from "axios"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import { env } from "$amplify/env/fetch-channel-videos"

// Configure Amplify for Lambda environment
Amplify.configure(
  {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: "iam"
      }
    }
  },
  {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  }
)

// Create the Amplify Data client
const client = generateClient<Schema>()

/**
 * Retrieves the YouTube API key from AWS Secrets Manager
 * @returns The YouTube API key
 * @throws Error if the API key cannot be retrieved
 */
async function getYouTubeApiKey(): Promise<string> {
  try {
    const client = new SecretsManagerClient({})
    const command = new GetSecretValueCommand({
      SecretId: process.env.YOUTUBE_API_SECRET_NAME || "youtube-api-key",
    })
    
    const response = await client.send(command)
    
    if (!response.SecretString) {
      throw new Error("API key not found in Secrets Manager")
    }
    
    return response.SecretString
  } catch (error) {
    console.error("Failed to retrieve YouTube API key from Secrets Manager:", error)
    throw new Error("Failed to retrieve YouTube API key")
  }
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
    const channelMatch = pathname.match(/^\/channel\/([^\/]+)/)
    if (channelMatch) {
      return channelMatch[1]
    }
    
    // Handle /@{HANDLE} format
    const handleMatch = pathname.match(/^\/@([^\/]+)/)
    if (handleMatch) {
      return `@${handleMatch[1]}`
    }
    
    // Handle /c/{CUSTOM_URL} format
    const customMatch = pathname.match(/^\/c\/([^\/]+)/)
    if (customMatch) {
      return customMatch[1]
    }
    
    // Handle /user/{USERNAME} format
    const userMatch = pathname.match(/^\/user\/([^\/]+)/)
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
    
    // If channelId starts with @, it's a handle - need to resolve it first
    if (channelId.startsWith('@')) {
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      const searchParams = {
        part: 'snippet',
        q: channelId,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
      
      const searchResponse = await axios.get(searchUrl, { params: searchParams })
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        throw new Error(`Channel not found for handle: ${channelId}`)
      }
      
      // Get the actual channel ID from search results
      channelId = searchResponse.data.items[0].snippet.channelId
    }
    
    // Fetch channel metadata using the channel ID
    const params = {
      part: 'snippet',
      id: channelId,
      key: apiKey
    }
    
    const response = await axios.get(baseUrl, { params })
    
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error(`Channel not found: ${channelId}`)
    }
    
    const channelName = response.data.items[0].snippet.title
    return channelName
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      
      if (status === 404) {
        throw new Error(`Channel not found: ${channelId}`)
      } else if (status === 403) {
        throw new Error('YouTube API access forbidden - check API key and quota')
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
    
    // If channelId starts with @, resolve it to actual channel ID first
    let actualChannelId = channelId
    if (channelId.startsWith('@')) {
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      const searchParams = {
        part: 'snippet',
        q: channelId,
        type: 'channel',
        maxResults: 1,
        key: apiKey
      }
      
      const searchResponse = await axios.get(searchUrl, { params: searchParams })
      
      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        throw new Error(`Channel not found for handle: ${channelId}`)
      }
      
      actualChannelId = searchResponse.data.items[0].snippet.channelId
    }
    
    // Paginate through all videos
    do {
      // Step 1: Get video IDs from search.list
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search'
      const searchParams: any = {
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
        .map((item: any) => item.id.videoId)
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
    const existingChannels = await client.models.Channel.list({
      filter: { 
        youtubeChannelId: { eq: channelData.youtubeChannelId },
        owner: { eq: owner }
      }
    })
    
    if (existingChannels.data && existingChannels.data.length > 0) {
      // Update existing channel name
      const channelId = existingChannels.data[0].id
      await client.models.Channel.update({
        id: channelId,
        name: channelData.name,
      })
      
      console.log(`Updated existing channel: ${channelId}`)
      return channelId
    } else {
      // Create new channel
      const result = await client.models.Channel.create({
        name: channelData.name,
        url: channelData.url,
        youtubeChannelId: channelData.youtubeChannelId,
        owner: owner,
      })
      
      if (!result.data) {
        throw new Error('Failed to create channel - no data returned')
      }
      
      console.log(`Created new channel: ${result.data.id}`)
      return result.data.id
    }
  } catch (error) {
    console.error('Failed to upsert channel:', error)
    throw new Error(`Database error: Failed to save channel`)
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
    
    // Step 1: Get YouTube API key from Secrets Manager
    let apiKey: string
    try {
      apiKey = await getYouTubeApiKey()
    } catch (error) {
      console.error("Secrets Manager error:", error)
      return {
        success: false,
        message: "Failed to retrieve YouTube API key from Secrets Manager",
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
      videos = await fetchAllVideos(channelId, apiKey)
      console.log(`Fetched ${videos.length} videos from channel`)
    } catch (error) {
      console.error("Video fetch error:", error)
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

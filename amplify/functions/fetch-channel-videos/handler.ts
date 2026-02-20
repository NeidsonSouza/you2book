// Node.js built-ins
import crypto from "crypto"

// AWS Amplify SDK
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/data"
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'

// Local modules
import type { Schema } from "../../data/resource"
import { env } from "$amplify/env/fetch-channel-videos"
import { extractChannelId } from "./url-parser"
import { fetchChannelMetadata, fetchAllVideos, type YouTubeVideo } from "./youtube-api"
import { upsertChannel, saveVideos, type TranscriptStats } from "./database"

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
 * Retrieves the S3 bucket name for transcript storage from environment variables
 * @returns The S3 bucket name
 * @throws Error if the bucket name is not configured
 */
function getTranscriptBucketName(): string {
  // TRANSCRIPT_BUCKET_NAME is added dynamically via CDK in backend.ts
  const bucketName = (env as { TRANSCRIPT_BUCKET_NAME?: string }).TRANSCRIPT_BUCKET_NAME
  
  if (!bucketName) {
    throw new Error("Transcript bucket name not configured")
  }
  
  return bucketName
}

/**
 * Main handler function for fetching channel videos
 * Orchestrates the entire flow: API key retrieval → URL parsing → channel fetch → video fetch → database operations
 * @param event The Lambda event containing channelUrl and user identity
 * @returns Response object with success status, message, timestamp, and videos
 */
export const handler: Schema["fetchChannelVideos"]["functionHandler"] = async (event) => {
  // Generate correlation ID and timestamp at the start
  const correlationId = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  
  try {
    // Extract arguments and user identity
    const { channelUrl } = event.arguments
    const owner = event.identity && 'sub' in event.identity ? event.identity.sub : undefined
    
    // Validate user authentication
    if (!owner) {
      console.error(JSON.stringify({
        correlationId,
        step: 'validateAuth',
        status: 'error',
        message: 'User identity not found'
      }))
      return {
        success: false,
        message: "User identity not found - authentication required",
        timestamp,
        videos: []
      }
    }
    
    console.log(JSON.stringify({
      correlationId,
      step: 'start',
      channelUrl,
      owner,
      status: 'processing'
    }))
    
    // Step 1: Get YouTube API key from environment
    let apiKey: string
    try {
      apiKey = getYouTubeApiKey()
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'getApiKey',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }))
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
      console.log(JSON.stringify({
        correlationId,
        step: 'extractChannelId',
        channelId,
        status: 'success'
      }))
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'extractChannelId',
        channelUrl,
        status: 'error',
        message: error instanceof Error ? error.message : 'Invalid URL format'
      }))
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
      console.log(JSON.stringify({
        correlationId,
        step: 'fetchChannelMetadata',
        channelId,
        channelName,
        status: 'success'
      }))
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'fetchChannelMetadata',
        channelId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch channel metadata'
      }))
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
      console.log(JSON.stringify({
        correlationId,
        step: 'fetchAllVideos',
        channelId,
        videoCount: videos.length,
        status: 'success'
      }))
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'fetchAllVideos',
        channelId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch videos'
      }))
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
        client,
        {
          name: channelName,
          url: channelUrl,
          youtubeChannelId: channelId
        },
        owner
      )
      console.log(JSON.stringify({
        correlationId,
        step: 'upsertChannel',
        channelId,
        dbChannelId,
        channelName,
        status: 'success'
      }))
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'upsertChannel',
        channelId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save channel'
      }))
      const errorMessage = error instanceof Error ? error.message : "Failed to save channel"
      return {
        success: false,
        message: `Database error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    // Step 6: Save videos to database with deduplication
    let saveResults: { saved: number; skipped: number; failed: number; transcriptStats: TranscriptStats }
    let bucketName: string
    try {
      bucketName = getTranscriptBucketName()
    } catch (error) {
      console.error(JSON.stringify({
        correlationId,
        step: 'getTranscriptBucketName',
        status: 'error',
        message: error instanceof Error ? error.message : 'Transcript bucket not configured'
      }))
      return {
        success: false,
        message: "Transcript bucket not configured. Please set the TRANSCRIPT_BUCKET_NAME environment variable.",
        timestamp: new Date().toISOString(),
        videos: []
      }
    }
    
    try {
      saveResults = await saveVideos(client, videos, dbChannelId, owner, apiKey, bucketName)
      console.log(JSON.stringify({
        correlationId,
        step: 'saveVideos',
        dbChannelId,
        saved: saveResults.saved,
        skipped: saveResults.skipped,
        failed: saveResults.failed,
        transcriptStats: saveResults.transcriptStats,
        status: 'success'
      }))
    } catch (error) {
      // This shouldn't happen as saveVideos handles errors internally
      console.error(JSON.stringify({
        correlationId,
        step: 'saveVideos',
        dbChannelId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unexpected error in saveVideos'
      }))
      saveResults = { 
        saved: 0, 
        skipped: 0, 
        failed: videos.length,
        transcriptStats: { successful: 0, failed: 0, skipped: 0 }
      }
    }
    
    // Build success response with descriptive message including transcript stats
    const message = `Successfully fetched ${videos.length} videos from channel "${channelName}". ` +
      `Saved: ${saveResults.saved}, Skipped (duplicates): ${saveResults.skipped}, Failed: ${saveResults.failed}. ` +
      `Transcripts - Successful: ${saveResults.transcriptStats.successful}, Failed: ${saveResults.transcriptStats.failed}, Skipped: ${saveResults.transcriptStats.skipped}`
    
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
    console.error(JSON.stringify({
      correlationId,
      step: 'handler',
      status: 'error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    }))
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
    
    return {
      success: false,
      message: `Failed to fetch channel videos: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      videos: []
    }
  }
}

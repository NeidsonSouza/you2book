// AWS Amplify SDK
import { generateClient } from "aws-amplify/data"

// Local modules
import type { Schema } from "../../data/resource"
import type { YouTubeVideo } from "./youtube-api"
import { processTranscript } from "./transcript"

type AmplifyClient = ReturnType<typeof generateClient<Schema>>

export interface TranscriptStats {
  successful: number
  failed: number
  skipped: number
}

export interface SaveVideosResult {
  saved: number
  skipped: number
  failed: number
  transcriptStats: TranscriptStats
}

/**
 * Creates or updates a channel record in the database
 * @param client The Amplify data client
 * @param channelData Object containing channel information
 * @param owner The Cognito user ID (owner)
 * @returns The channel ID
 * @throws Error if database operations fail
 */
export async function upsertChannel(
  client: AmplifyClient,
  channelData: { name: string; url: string; youtubeChannelId: string },
  owner: string
): Promise<string> {
  try {
    // Query for existing channel by youtubeChannelId
    console.log(JSON.stringify({
      step: 'upsertChannel',
      operation: 'query',
      youtubeChannelId: channelData.youtubeChannelId,
      owner,
      status: 'querying'
    }))
    const existingChannels = await client.models.Channel.list({
      filter: { 
        youtubeChannelId: { eq: channelData.youtubeChannelId },
        owner: { eq: owner }
      }
    })
    
    if (existingChannels.errors) {
      console.error(JSON.stringify({
        step: 'upsertChannel',
        operation: 'query',
        youtubeChannelId: channelData.youtubeChannelId,
        status: 'error',
        errors: existingChannels.errors.map(e => e.message)
      }))
      throw new Error('upsertChannel: Failed to query channels (youtubeChannelId=' + channelData.youtubeChannelId + '): ' + existingChannels.errors.map(e => e.message).join(', '))
    }
    
    if (existingChannels.data && existingChannels.data.length > 0) {
      // Update existing channel name
      const channelId = existingChannels.data[0].id
      const updateResult = await client.models.Channel.update({
        id: channelId,
        name: channelData.name,
      })
      
      if (updateResult.errors) {
        console.error(JSON.stringify({
          step: 'upsertChannel',
          operation: 'update',
          channelId,
          status: 'error',
          errors: updateResult.errors.map(e => e.message)
        }))
        throw new Error('upsertChannel: Failed to update channel (channelId=' + channelId + '): ' + updateResult.errors.map(e => e.message).join(', '))
      }
      
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'update',
        channelId,
        status: 'success'
      }))
      return channelId
    } else {
      // Create new channel
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'create',
        youtubeChannelId: channelData.youtubeChannelId,
        owner,
        status: 'creating'
      }))
      const result = await client.models.Channel.create({
        name: channelData.name,
        url: channelData.url,
        youtubeChannelId: channelData.youtubeChannelId,
        owner: owner,
      })
      
      if (result.errors) {
        console.error(JSON.stringify({
          step: 'upsertChannel',
          operation: 'create',
          youtubeChannelId: channelData.youtubeChannelId,
          status: 'error',
          errors: result.errors.map(e => e.message)
        }))
        throw new Error('upsertChannel: Failed to create channel (youtubeChannelId=' + channelData.youtubeChannelId + '): ' + result.errors.map(e => e.message).join(', '))
      }
      
      if (!result.data) {
        throw new Error('upsertChannel: Failed to create channel - no data returned (youtubeChannelId=' + channelData.youtubeChannelId + ')')
      }
      
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'create',
        channelId: result.data.id,
        status: 'success'
      }))
      return result.data.id
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
    console.error(JSON.stringify({
      step: 'upsertChannel',
      youtubeChannelId: channelData.youtubeChannelId,
      status: 'error',
      message: errorMessage
    }))
    throw new Error(`upsertChannel: Database error (youtubeChannelId=${channelData.youtubeChannelId}): ${errorMessage}`)
  }
}

/**
 * Saves videos to the database with deduplication and transcript processing
 * @param client The Amplify data client
 * @param videos Array of video metadata objects
 * @param channelId The channel ID to associate videos with
 * @param owner The Cognito user ID (owner)
 * @param apiKey The YouTube API key for fetching captions
 * @param bucketName The S3 bucket name for storing transcripts
 * @returns Object with counts of saved and skipped videos, plus transcript stats
 * @throws Error if critical database operations fail
 */
export async function saveVideos(
  client: AmplifyClient,
  videos: YouTubeVideo[],
  channelId: string,
  owner: string,
  apiKey: string,
  bucketName: string
): Promise<SaveVideosResult> {
  let savedCount = 0
  let skippedCount = 0
  let failedCount = 0
  
  const transcriptStats: TranscriptStats = {
    successful: 0,
    failed: 0,
    skipped: 0
  }
  
  for (const video of videos) {
    try {
      // Query for existing video by youtubeId
      const existingVideos = await client.models.Video.list({
        filter: { 
          youtubeId: { eq: video.youtubeId },
          owner: { eq: owner }
        }
      })

      if (existingVideos.errors) {
        console.error(JSON.stringify({
          step: 'saveVideos',
          operation: 'query',
          videoYoutubeId: video.youtubeId,
          status: 'error',
          errors: existingVideos.errors.map(e => e.message)
        }))
        failedCount++
        continue
      }
      
      if (existingVideos.data && existingVideos.data.length > 0) {
        // Video already exists, skip it (and skip transcript fetching)
        skippedCount++
        transcriptStats.skipped++
        console.log(JSON.stringify({
          step: 'saveVideos',
          operation: 'skip',
          videoYoutubeId: video.youtubeId,
          status: 'skipped'
        }))
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
        console.log(JSON.stringify({
          step: 'saveVideos',
          operation: 'create',
          videoYoutubeId: video.youtubeId,
          videoId: result.data.id,
          status: 'success'
        }))
        
        // Process transcript for the newly created video
        const transcriptResult = await processTranscript({
          videoYoutubeId: video.youtubeId,
          channelId,
          owner,
          apiKey,
          bucketName
        })
        
        if (transcriptResult.success && transcriptResult.key) {
          // Update video record with transcript information
          const updateResult = await client.models.Video.update({
            id: result.data.id,
            transcriptKey: transcriptResult.key,
            transcriptAvailable: true
          })
          
          if (updateResult.errors) {
            console.error(JSON.stringify({
              step: 'saveVideos',
              operation: 'updateTranscript',
              videoYoutubeId: video.youtubeId,
              videoId: result.data.id,
              status: 'error',
              errors: updateResult.errors.map(e => e.message)
            }))
            transcriptStats.failed++
          } else {
            transcriptStats.successful++
            console.log(JSON.stringify({
              step: 'saveVideos',
              operation: 'updateTranscript',
              videoYoutubeId: video.youtubeId,
              videoId: result.data.id,
              status: 'success'
            }))
          }
        } else {
          transcriptStats.failed++
        }
      } else {
        failedCount++
        console.error(JSON.stringify({
          step: 'saveVideos',
          operation: 'create',
          videoYoutubeId: video.youtubeId,
          status: 'error',
          message: 'No data returned'
        }))
      }
    } catch (error) {
      // Handle individual save failures gracefully - log and continue
      failedCount++
      console.error(JSON.stringify({
        step: 'saveVideos',
        videoYoutubeId: video.youtubeId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }))
      // Continue processing remaining videos
    }
  }
  
  // Log transcript processing summary
  console.log(JSON.stringify({
    step: 'saveVideos',
    operation: 'summary',
    saved: savedCount,
    skipped: skippedCount,
    failed: failedCount,
    transcriptStats,
    status: 'complete'
  }))
  
  return { saved: savedCount, skipped: skippedCount, failed: failedCount, transcriptStats }
}

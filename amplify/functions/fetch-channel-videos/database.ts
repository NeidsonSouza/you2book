// AWS Amplify SDK
import { generateClient } from "aws-amplify/data"

// Local modules
import type { Schema } from "../../data/resource"
import type { YouTubeVideo } from "./youtube-api"
import { invokeTranscriptLambda } from "./transcript-invoker"

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
      // Update name only - URL and youtubeChannelId are immutable after creation
      const channelId = existingChannels.data[0].id
      const channelUpdateResult = await client.models.Channel.update({
        id: channelId,
        name: channelData.name,
      })
      
      if (channelUpdateResult.errors) {
        console.error(JSON.stringify({
          step: 'upsertChannel',
          operation: 'update',
          channelId,
          status: 'error',
          errors: channelUpdateResult.errors.map(e => e.message)
        }))
        throw new Error('upsertChannel: Failed to update channel (channelId=' + channelId + '): ' + channelUpdateResult.errors.map(e => e.message).join(', '))
      }
      
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'update',
        channelId,
        status: 'success'
      }))
      return channelId
    } else {
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'create',
        youtubeChannelId: channelData.youtubeChannelId,
        owner,
        status: 'creating'
      }))
      const channelCreateResult = await client.models.Channel.create({
        name: channelData.name,
        url: channelData.url,
        youtubeChannelId: channelData.youtubeChannelId,
        owner: owner,
      })
      
      if (channelCreateResult.errors) {
        console.error(JSON.stringify({
          step: 'upsertChannel',
          operation: 'create',
          youtubeChannelId: channelData.youtubeChannelId,
          status: 'error',
          errors: channelCreateResult.errors.map(e => e.message)
        }))
        throw new Error('upsertChannel: Failed to create channel (youtubeChannelId=' + channelData.youtubeChannelId + '): ' + channelCreateResult.errors.map(e => e.message).join(', '))
      }
      
      if (!channelCreateResult.data) {
        throw new Error('upsertChannel: Failed to create channel - no data returned (youtubeChannelId=' + channelData.youtubeChannelId + ')')
      }
      
      console.log(JSON.stringify({
        step: 'upsertChannel',
        operation: 'create',
        channelId: channelCreateResult.data.id,
        status: 'success'
      }))
      return channelCreateResult.data.id
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
 * @param apiKey The YouTube API key for fetching captions (unused, kept for compatibility)
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
  
  // Track new videos for batch transcript processing
  const newVideos: Array<{ youtubeId: string; dbId: string }> = []
  
  for (const video of videos) {
    try {
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
        // Skip duplicate - transcript was already processed on first save
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
      
      const videoCreateResult = await client.models.Video.create({
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description || '',
        duration: video.duration,
        channelId: channelId,
        owner: owner,
      })
      
      if (videoCreateResult.data) {
        savedCount++
        console.log(JSON.stringify({
          step: 'saveVideos',
          operation: 'create',
          videoYoutubeId: video.youtubeId,
          videoId: videoCreateResult.data.id,
          status: 'success'
        }))
        
        // Collect new video for batch transcript processing
        newVideos.push({
          youtubeId: video.youtubeId,
          dbId: videoCreateResult.data.id
        })
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
      // Continue processing remaining videos even if one fails
      failedCount++
      console.error(JSON.stringify({
        step: 'saveVideos',
        videoYoutubeId: video.youtubeId,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }
  
  // Process transcripts in batch for all new videos
  if (newVideos.length > 0) {
    const functionName = process.env.SAVE_TRANSCRIPT_FUNCTION_NAME
    
    if (!functionName) {
      console.warn(JSON.stringify({
        step: 'saveVideos',
        operation: 'batchTranscripts',
        status: 'skipped',
        message: 'SAVE_TRANSCRIPT_FUNCTION_NAME environment variable not set'
      }))
      transcriptStats.skipped += newVideos.length
    } else {
      try {
        const transcriptResults = await invokeTranscriptLambda({
          videoYoutubeIds: newVideos.map(v => v.youtubeId),
          owner,
          channelId,
          bucketName,
          functionName
        })
        
        // Update DynamoDB with transcript results
        for (const result of transcriptResults) {
          const videoRecord = newVideos.find(v => v.youtubeId === result.videoYoutubeId)
          
          if (!videoRecord) {
            console.warn(JSON.stringify({
              step: 'saveVideos',
              operation: 'updateTranscript',
              videoYoutubeId: result.videoYoutubeId,
              status: 'warning',
              message: 'Video record not found for transcript result'
            }))
            continue
          }
          
          if (result.success && result.transcriptKey) {
            const transcriptUpdateResult = await client.models.Video.update({
              id: videoRecord.dbId,
              transcriptKey: result.transcriptKey,
              transcriptAvailable: true
            })
            
            if (transcriptUpdateResult.errors) {
              console.error(JSON.stringify({
                step: 'saveVideos',
                operation: 'updateTranscript',
                videoYoutubeId: result.videoYoutubeId,
                videoId: videoRecord.dbId,
                status: 'error',
                errors: transcriptUpdateResult.errors.map(e => e.message)
              }))
              transcriptStats.failed++
            } else {
              transcriptStats.successful++
              console.log(JSON.stringify({
                step: 'saveVideos',
                operation: 'updateTranscript',
                videoYoutubeId: result.videoYoutubeId,
                videoId: videoRecord.dbId,
                status: 'success'
              }))
            }
          } else {
            transcriptStats.failed++
            console.log(JSON.stringify({
              step: 'saveVideos',
              operation: 'updateTranscript',
              videoYoutubeId: result.videoYoutubeId,
              status: 'failed',
              error: result.error
            }))
          }
        }
      } catch (error) {
        console.error(JSON.stringify({
          step: 'saveVideos',
          operation: 'batchTranscripts',
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }))
        transcriptStats.failed += newVideos.length
      }
    }
  }
  
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

// External libraries
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

// Local modules
import { fetchTranscript } from "./youtube-api"

// Module-level S3 client singleton
const s3Client = new S3Client({})

/**
 * Generates the S3 key for storing a video transcript
 * @param owner The Cognito user ID (owner/entity_id)
 * @param channelId The DynamoDB channel record ID
 * @param videoYoutubeId The YouTube video ID
 * @returns The S3 key in format: transcripts/{owner}/{channelId}/{videoYoutubeId}.txt
 */
export function buildTranscriptKey(owner: string, channelId: string, videoYoutubeId: string): string {
  return `transcripts/${owner}/${channelId}/${videoYoutubeId}.txt`
}

/**
 * Uploads transcript content to S3
 * @param params Object containing bucketName, key, and content
 * @returns Promise that resolves when upload is complete
 */
async function uploadTranscriptToS3(params: { bucketName: string; key: string; content: string }): Promise<void> {
  const { bucketName, key, content } = params
  
  try {
    console.log(JSON.stringify({
      step: 'uploadTranscriptToS3',
      key,
      contentLength: content.length,
      status: 'uploading'
    }))
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain; charset=utf-8'
    })
    
    await s3Client.send(command)
    
    console.log(JSON.stringify({
      step: 'uploadTranscriptToS3',
      key,
      status: 'success'
    }))
  } catch (error) {
    console.error(JSON.stringify({
      step: 'uploadTranscriptToS3',
      key,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    throw error
  }
}

/**
 * Orchestrates the full transcript processing flow for a single video
 * @param params Object containing video metadata and configuration
 * @returns Object with success status and optional S3 key
 */
export async function processTranscript(params: {
  videoYoutubeId: string
  channelId: string
  owner: string
  apiKey: string
  bucketName: string
}): Promise<{ success: boolean; key?: string }> {
  const { videoYoutubeId, channelId, owner, apiKey, bucketName } = params
  
  try {
    const plainText = await fetchTranscript(videoYoutubeId, apiKey)
    
    if (!plainText) {
      return { success: false }
    }
    
    const key = buildTranscriptKey(owner, channelId, videoYoutubeId)
    
    await uploadTranscriptToS3({ bucketName, key, content: plainText })
    
    return { success: true, key }
  } catch (error) {
    console.error(JSON.stringify({
      step: 'processTranscript',
      videoYoutubeId,
      channelId,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    return { success: false }
  }
}

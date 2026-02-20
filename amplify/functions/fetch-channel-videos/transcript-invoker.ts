// AWS SDK
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"

/**
 * Result of a single video transcript operation
 */
export interface TranscriptResult {
  videoYoutubeId: string
  success: boolean
  transcriptKey?: string
  error?: string
}

/**
 * Parameters for invoking the transcript Lambda
 */
export interface InvokeTranscriptParams {
  videoYoutubeIds: string[]
  owner: string
  channelId: string
  bucketName: string
  functionName: string
}

/**
 * Response payload from the Python Lambda
 */
interface TranscriptLambdaResponse {
  results: TranscriptResult[]
}

/**
 * Invokes the Python Lambda to fetch and save transcripts for a batch of videos
 * @param params Parameters including video IDs, metadata, and Lambda function name
 * @returns Array of transcript results, one per video
 */
export async function invokeTranscriptLambda(params: InvokeTranscriptParams): Promise<TranscriptResult[]> {
  const { videoYoutubeIds, owner, channelId, bucketName, functionName } = params
  
  // Build the invocation payload
  const payload = {
    videoYoutubeIds,
    owner,
    channelId,
    bucketName
  }
  
  const lambdaClient = new LambdaClient({})
  
  try {
    console.log(JSON.stringify({
      step: 'invokeTranscriptLambda',
      operation: 'invoke',
      functionName,
      videoCount: videoYoutubeIds.length,
      status: 'invoking'
    }))
    
    // Invoke the Lambda synchronously
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload)
    })
    
    const response = await lambdaClient.send(command)
    
    // Check for function errors
    if (response.FunctionError) {
      console.error(JSON.stringify({
        step: 'invokeTranscriptLambda',
        operation: 'invoke',
        functionName,
        status: 'error',
        functionError: response.FunctionError,
        payload: response.Payload ? new TextDecoder().decode(response.Payload) : undefined
      }))
      
      // Return all videos as failed
      return videoYoutubeIds.map(videoYoutubeId => ({
        videoYoutubeId,
        success: false,
        error: `Lambda invocation failed: ${response.FunctionError}`
      }))
    }
    
    // Parse the response payload
    if (!response.Payload) {
      console.error(JSON.stringify({
        step: 'invokeTranscriptLambda',
        operation: 'invoke',
        functionName,
        status: 'error',
        message: 'No payload in response'
      }))
      
      return videoYoutubeIds.map(videoYoutubeId => ({
        videoYoutubeId,
        success: false,
        error: 'No payload in Lambda response'
      }))
    }
    
    const payloadString = new TextDecoder().decode(response.Payload)
    
    let parsedResponse: TranscriptLambdaResponse
    try {
      parsedResponse = JSON.parse(payloadString) as TranscriptLambdaResponse
    } catch (error) {
      console.error(JSON.stringify({
        step: 'invokeTranscriptLambda',
        operation: 'parseResponse',
        functionName,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to parse JSON',
        payload: payloadString
      }))
      
      return videoYoutubeIds.map(videoYoutubeId => ({
        videoYoutubeId,
        success: false,
        error: 'Invalid JSON response from Lambda'
      }))
    }
    
    console.log(JSON.stringify({
      step: 'invokeTranscriptLambda',
      operation: 'invoke',
      functionName,
      status: 'success',
      resultCount: parsedResponse.results.length
    }))
    
    return parsedResponse.results
  } catch (error) {
    console.error(JSON.stringify({
      step: 'invokeTranscriptLambda',
      operation: 'invoke',
      functionName,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }))
    
    // Return all videos as failed on invocation error
    return videoYoutubeIds.map(videoYoutubeId => ({
      videoYoutubeId,
      success: false,
      error: `Lambda invocation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }))
  }
}

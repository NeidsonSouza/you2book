import boto3
import json
import uuid
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AGENT_RUNTIME_ARN = os.environ.get('AGENT_RUNTIME_ARN', '')

logger.info(f"Initialized with runtime ARN | arn={AGENT_RUNTIME_ARN}")


def handler(event, context):
    body = event if isinstance(event, dict) else json.loads(event)

    video_url = body.get('videoUrl', '')
    session_id = body.get('sessionId') or str(uuid.uuid4()) + '-agentinvoker'

    # Log only metadata, not full event payload
    logger.info(f"Request received | functionArn={context.invoked_function_arn} | requestId={context.aws_request_id} | sessionId={session_id} | videoUrl={video_url}")

    if not AGENT_RUNTIME_ARN:
        logger.error(f"Missing AGENT_RUNTIME_ARN environment variable | sessionId={session_id}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Agent runtime not configured'})
        }

    arn = AGENT_RUNTIME_ARN
    region = arn.split(':')[3] if arn.count(':') >= 3 else 'us-east-1'

    if not video_url:
        logger.error(f"Missing required field: videoUrl | sessionId={session_id}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: videoUrl'})
        }

    payload = json.dumps({'input': {'video_url': video_url}}).encode()

    logger.info(f"Invoking AgentCore | runtimeArn={arn} | region={region} | sessionId={session_id} | videoUrl={video_url}")

    try:
        agent_core_client = boto3.client('bedrock-agentcore', region_name=region)

        response = agent_core_client.invoke_agent_runtime(
            agentRuntimeArn=arn,
            runtimeSessionId=session_id,
            payload=payload,
        )

        content_type = response.get('contentType', '')
        http_status = response.get('ResponseMetadata', {}).get('HTTPStatusCode')
        logger.info(f"Response received | contentType={content_type} | httpStatus={http_status} | sessionId={session_id}")

        chunks = []

        if 'text/event-stream' in content_type:
            for line in response['response'].iter_lines(chunk_size=10):
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        chunks.append(decoded[6:])
            result = '\n'.join(chunks)
        elif content_type == 'application/json':
            raw = []
            for chunk in response.get('response', []):
                raw.append(chunk.decode('utf-8'))
            result = json.loads(''.join(raw))
        else:
            result = response['response'].read().decode('utf-8')

        logger.info(f"Success | sessionId={session_id} | responseLength={len(str(result))}")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'sessionId': session_id,
                'response': result,
            })
        }

    except Exception as e:
        error_type = type(e).__name__
        logger.error(f"InvokeAgentRuntime failed | errorType={error_type} | runtimeArn={arn} | region={region} | sessionId={session_id} | error={str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

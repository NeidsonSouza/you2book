import boto3
import json
import uuid
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

AGENT_RUNTIME_ARN = os.environ.get('AGENT_RUNTIME_ARN', '')
REGION = AGENT_RUNTIME_ARN.split(':')[3] if AGENT_RUNTIME_ARN.count(':') >= 3 else 'us-east-1'

logger.info(f"Initializing bedrock-agentcore client | region={REGION} | arn={AGENT_RUNTIME_ARN}")
agent_core_client = boto3.client('bedrock-agentcore', region_name=REGION)


def handler(event, context):
    body = event if isinstance(event, dict) else json.loads(event)
    
    prompt = body.get('prompt', '')
    session_id = body.get('sessionId') or str(uuid.uuid4()) + '-agentinvoker'
    
    # Log only metadata, not full event payload
    logger.info(f"Request received | functionArn={context.invoked_function_arn} | requestId={context.aws_request_id} | sessionId={session_id} | promptLength={len(prompt)}")
    
    if not prompt:
        logger.error(f"Missing required field: prompt | sessionId={session_id}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: prompt'})
        }

    payload = json.dumps({'input': {'prompt': prompt}}).encode()

    logger.info(f"Invoking AgentCore | runtimeArn={AGENT_RUNTIME_ARN} | sessionId={session_id} | promptLength={len(prompt)}")

    try:
        response = agent_core_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
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
        logger.error(f"InvokeAgentRuntime failed | errorType={error_type} | runtimeArn={AGENT_RUNTIME_ARN} | region={REGION} | sessionId={session_id} | error={str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

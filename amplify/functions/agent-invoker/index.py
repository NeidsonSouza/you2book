import boto3
import json
import uuid
import os

agent_core_client = boto3.client('bedrock-agentcore', region_name='us-west-2')

AGENT_RUNTIME_ARN = os.environ['AGENT_RUNTIME_ARN']


def handler(event, context):
    body = event if isinstance(event, dict) else json.loads(event)

    prompt = body.get('prompt', '')
    if not prompt:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: prompt'})
        }

    session_id = body.get('sessionId') or str(uuid.uuid4()) + '-agentinvoker'

    payload = json.dumps({'prompt': prompt}).encode()

    try:
        response = agent_core_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=payload,
        )

        content_type = response.get('contentType', '')
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

        return {
            'statusCode': 200,
            'body': json.dumps({
                'sessionId': session_id,
                'response': result,
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

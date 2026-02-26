import json


def resolve_agent(agent_name, registry_map):
    """Resolve an agent name to its runtime ARN using the registry map.

    Returns the ARN string if found, or an error dict with 400 status otherwise.
    """
    if not agent_name:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required field: agentName'})
        }

    arn = registry_map.get(agent_name)
    if arn is None:
        return {
            'statusCode': 400,
            'body': json.dumps({
                'error': f'Unknown agent: {agent_name}',
                'available': sorted(list(registry_map.keys()))
            })
        }

    return arn

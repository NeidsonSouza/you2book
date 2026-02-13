# Video Grouping Design

## Architecture Overview

This feature adds AI-powered video clustering to suggest thematic book groups. The system uses a two-stage approach: first generating semantic summaries for each video, then clustering based on those summaries.

### Components
1. Frontend: Button + display component in ChannelDetail
2. Backend: Lambda function with xAI integration via Strands Agents
3. Data: New BookGroup model in DynamoDB

## Data Model Changes

### New Model: BookGroup

```typescript
BookGroup: a.model({
  channelId: a.id().required(),
  channel: a.belongsTo('Channel', 'channelId'),
  title: a.string().required(),
  themeDescription: a.string(),
  videoIds: a.string().array().required(), // Array of video IDs
  createdAt: a.datetime().required(),
})
.authorization(allow => [allow.owner()])
.secondaryIndexes(index => [
  index('channelId').name('byChannel')
])
```

### Update Channel Model
Add relationship to BookGroups:
```typescript
bookGroups: a.hasMany('BookGroup', 'channelId')
```

## Backend Design

### Lambda Function: suggestBookGroups

**Location**: `amplify/functions/suggest-book-groups/`

**Runtime**: Python 3.12

**Input**:
```python
{
  "channelId": str
}
```

**Output**:
```python
{
  "success": bool,
  "groups": List[{
    "title": str,
    "themeDescription": str,
    "videoIds": List[str]
  }],
  "error": Optional[str]
}
```

**Processing Flow**:

1. **Fetch Videos**
   - Query DynamoDB for all videos with matching channelId
   - Validate at least 1 video exists

2. **Generate Summaries** (Stage 1)
   - For each video, create input: `{ title, description, duration }`
   - Call xAI via Strands Agents to generate semantic summary (2-3 sentences)
   - Store summaries in memory: `Map<videoId, summary>`

3. **Cluster Videos** (Stage 2)
   - Prepare clustering input: array of `{ videoId, title, summary }`
   - Call xAI via Strands Agents with clustering prompt
   - AI returns: array of groups with titles, descriptions, and videoIds

4. **Store Results**
   - Delete existing BookGroups for this channel
   - Create new BookGroup records in DynamoDB
   - Return results to frontend

**AI Prompts**:

*Summary Generation Prompt*:
```
Analyze this YouTube video and generate a 2-3 sentence semantic summary capturing the main topics and key concepts:

Title: {title}
Description: {description}
Duration: {duration}

Focus on educational content, main themes, and subject matter. Be concise and specific.
```

*Clustering Prompt*:
```
You are analyzing videos from a YouTube channel to group them into thematic clusters for ebook creation.

Videos:
{array of: videoId, title, summary}

Task:
1. Identify 1-10 thematic groups based on content similarity and correlation
2. Each group should contain videos that form a cohesive narrative or topic
3. Suggest a clear, descriptive title for each group (5-10 words)
4. Provide a brief theme description (1-2 sentences)
5. Assign each video to exactly one group

Return JSON format:
{
  "groups": [
    {
      "title": "string",
      "themeDescription": "string",
      "videoIds": ["string"]
    }
  ]
}

Guidelines:
- Minimum 1 video per group
- Groups should be logical and cohesive
- Prioritize educational/tutorial series
- Consider video sequence and progression
```

### Strands Agents Integration

**Setup**:
```python
from strands import Agent

agent = Agent(
    model='xai/grok-2',  # or appropriate xAI model
    # configuration from environment variables
)
```

**Summary Generation**:
```python
summary = agent.run(
    prompt=summary_prompt,
    max_tokens=200
)
```

**Clustering**:
```python
clustering_result = agent.run(
    prompt=clustering_prompt,
    max_tokens=2000,
    response_format='json'
)
```

## Frontend Design

### ChannelDetail.tsx Updates

**Add Button**:
```tsx
<button 
  onClick={handleSuggestGroups}
  disabled={videos.length < 1 || isLoading}
>
  {isLoading ? 'Analyzing...' : 'Suggest Book Groups'}
</button>
```

**State Management**:
```typescript
const [bookGroups, setBookGroups] = useState<BookGroup[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Handler**:
```typescript
const handleSuggestGroups = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const result = await client.queries.suggestBookGroups({
      channelId: channel.id
    });
    
    if (result.data?.success) {
      // Fetch updated book groups from DB
      const groups = await client.models.BookGroup.list({
        filter: { channelId: { eq: channel.id } }
      });
      setBookGroups(groups.data);
    } else {
      setError(result.data?.error || 'Failed to generate groups');
    }
  } catch (err) {
    setError('An error occurred while generating groups');
  } finally {
    setIsLoading(false);
  }
};
```

### Display Component: BookGroupsList

**New Component**: `src/BookGroupsList.tsx`

```tsx
interface BookGroupsListProps {
  groups: BookGroup[];
  videos: Video[];
}

export function BookGroupsList({ groups, videos }: BookGroupsListProps) {
  return (
    <div className="book-groups">
      <h2>Suggested Book Groups</h2>
      {groups.map(group => (
        <div key={group.id} className="book-group">
          <h3>{group.title}</h3>
          <p>{group.themeDescription}</p>
          <p>{group.videoIds.length} videos</p>
          <ul>
            {group.videoIds.map(videoId => {
              const video = videos.find(v => v.id === videoId);
              return video ? <li key={videoId}>{video.title}</li> : null;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling

### Backend Errors
- **No videos found**: Return error message
- **AI service timeout**: 5-minute timeout, return partial results or error
- **AI service failure**: Catch and return user-friendly error
- **DynamoDB errors**: Log and return generic error

### Frontend Errors
- Display error message below button
- Allow retry after error
- Clear error on successful retry

## Performance Considerations

### Optimization Strategies
1. **Batch Summary Generation**: Process videos in parallel (max 10 concurrent)
2. **Caching**: Store summaries in Video model for future use (optional enhancement)
3. **Timeout Management**: Set appropriate Lambda timeout (5 minutes)
4. **Rate Limiting**: Handle xAI API rate limits with exponential backoff

### Scalability Limits (MVP)
- Max 100 videos per channel
- Max 5-minute processing time
- If exceeded, return error asking user to contact support

## Security

- All operations require authentication (Cognito)
- Owner-based authorization on BookGroup model
- Validate channelId belongs to authenticated user
- Sanitize AI responses before storing

## Testing Strategy

### Unit Tests
1. Lambda handler input validation
2. Summary generation logic
3. Clustering result parsing
4. DynamoDB operations

### Integration Tests
1. End-to-end flow: button click → AI processing → display results
2. Error handling scenarios
3. Edge cases: 3 videos, 100 videos

### Manual Testing
1. Test with real YouTube channel data
2. Verify AI groupings make sense
3. Test loading states and error messages
4. Test with single video channels

## Deployment

1. Add Strands Agents dependencies to Lambda function (requirements.txt)
2. Configure xAI API credentials in environment variables
3. Deploy schema changes (BookGroup model)
4. Deploy Lambda function (Python 3.12 runtime)
5. Deploy frontend changes
6. Test in sandbox environment before production

## Python Lambda Structure

```
amplify/functions/suggest-book-groups/
├── handler.py          # Main Lambda handler
├── requirements.txt    # Python dependencies
└── resource.ts         # Lambda configuration
```

**requirements.txt**:
```
strands-agents>=0.1.0
boto3>=1.34.0
```

**handler.py structure**:
```python
import json
import os
from typing import Dict, List, Any
from strands import Agent
import boto3

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler for suggesting book groups
    
    Args:
        event: Contains channelId in arguments
        context: Lambda context
        
    Returns:
        Response with success, groups, and optional error
    """
    try:
        channel_id = event['arguments']['channelId']
        
        # Implementation here
        
        return {
            'success': True,
            'groups': [],
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'groups': [],
            'error': str(e)
        }
```

## Future Enhancements (Post-MVP)
- Edit/reassign videos between groups
- Exclude videos from grouping
- Manual group creation
- Cache summaries in Video model
- Support for actual transcript analysis
- Group quality scoring

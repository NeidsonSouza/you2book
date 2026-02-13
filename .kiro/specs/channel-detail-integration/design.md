# Design Document: Channel Detail Integration

## Overview

This design refactors the ChannelDetail component to integrate with Amplify Data models, replacing hardcoded fake data with real backend queries. The refactor improves code organization by extracting reusable utilities, implements proper loading and error states, and ensures consistent Tailwind CSS styling throughout the component.

## Architecture

The refactored component follows a standard React data-fetching pattern:

1. **Component Mount** → Initialize loading state
2. **Data Fetching** → Query Amplify Data for ebooks with related videos
3. **State Management** → Store ebooks, loading, and error states
4. **Rendering** → Display loading, error, or ebook list based on state

The architecture maintains separation of concerns:
- **Data Layer**: Amplify Data client handles GraphQL queries
- **Utility Layer**: Shared formatting functions in `src/lib/utils.ts`
- **Presentation Layer**: React component handles UI rendering

## Components and Interfaces

### 1. Date Formatting Utility

**Location**: `src/lib/utils.ts`

**Function Signature**:
```typescript
function formatDate(date: Date | string | null | undefined): string
```

**Behavior**:
- Accepts Date objects, ISO datetime strings, null, or undefined
- Returns formatted string in "MMM DD, YYYY" format (e.g., "Feb 03, 2026")
- Returns "Unknown date" for null/undefined inputs
- Converts string inputs to Date objects before formatting

### 2. ChannelDetail Component Refactor

**Location**: `src/ChannelDetail.tsx`

**State Management**:
```typescript
const [ebooks, setEbooks] = useState<Ebook[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);
```

**Data Fetching Logic**:
```typescript
useEffect(() => {
  async function fetchEbooks() {
    setLoading(true);
    setError(null);
    
    try {
      // Query ebooks for the channel
      const response = await client.models.Ebook.list({
        filter: { channelId: { eq: channelId } }
      });
      
      // For each ebook, fetch related source videos
      const ebooksWithVideos = await Promise.all(
        response.data.map(async (ebook) => {
          const videosResponse = await ebook.sourceVideos();
          return {
            ...ebook,
            sourceVideos: videosResponse.data
          };
        })
      );
      
      setEbooks(ebooksWithVideos);
    } catch (err) {
      console.error('Error fetching ebooks:', err);
      setError('Failed to load ebooks. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  if (channelId) {
    fetchEbooks();
  }
}, [channelId]);
```

**Rendering Logic**:
- **Loading State**: Display centered spinner or loading message
- **Error State**: Display error message with retry option
- **Empty State**: Display "No ebooks yet" message
- **Success State**: Display grid of ebook cards

### 3. Amplify Client Integration

**Import Statement**:
```typescript
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';

const client = generateClient<Schema>();
```

## Data Models

### Ebook Model (from Amplify Data)

```typescript
{
  id: string;
  title: string;
  pageCount: number;
  generatedDate: string; // ISO datetime string
  pdfUrl: string;
  channelId: string;
  sourceVideos: EbookVideo[]; // Loaded via relationship
  owner: string; // Cognito user ID (implicit)
}
```

### EbookVideo Model (from Amplify Data)

```typescript
{
  id: string;
  title: string;
  url: string;
  ebookId: string;
  owner: string; // Cognito user ID (implicit)
}
```

### Component State Types

```typescript
type EbookWithVideos = Schema['Ebook']['type'] & {
  sourceVideos: Schema['EbookVideo']['type'][];
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I identified the following testable properties and examples. Several criteria were combined or eliminated to avoid redundancy:

**Properties to implement:**
- Property 1: Ebook rendering completeness (combines 2.3, 7.2)
- Property 2: Source video rendering (combines 2.5, 7.3)
- Property 3: Date formatting consistency (3.2, 3.3)
- Property 4: Download link correctness (7.4)
- Property 5: URL decoding (7.6)

**Examples to implement:**
- Loading state behavior (4.1, 4.2, 4.3 combined)
- Error state behavior (5.1, 5.2, 5.3, 5.5 combined)
- Empty state behavior (7.5)
- Navigation behavior (7.1)
- Data fetching with relationships (2.1, 2.2 combined)

**Edge cases:**
- Null/undefined date handling (3.5)

**Not testable (code review):**
- Code structure requirements (1.1, 1.3, 3.1, 3.4, 6.1-6.4)
- Authorization (2.4 - handled by Amplify)

### Correctness Properties

**Property 1: Ebook rendering completeness**

*For any* valid ebook object with title, pageCount, and generatedDate fields, when rendered in the component, the output SHALL contain all three pieces of information in the DOM.

**Validates: Requirements 2.3, 7.2**

**Property 2: Source video rendering**

*For any* ebook with N source videos (where N > 0), when rendered in the component, the output SHALL contain exactly N clickable links with the correct video titles and URLs.

**Validates: Requirements 2.5, 7.3**

**Property 3: Date formatting consistency**

*For any* valid Date object or ISO datetime string, the formatDate utility SHALL return a string matching the pattern "MMM DD, YYYY" where MMM is a three-letter month abbreviation, DD is a 1-2 digit day, and YYYY is a four-digit year.

**Validates: Requirements 3.2, 3.3**

**Property 4: Download link correctness**

*For any* ebook with a pdfUrl field, when rendered in the component, the download button's href attribute SHALL equal the ebook's pdfUrl value.

**Validates: Requirements 7.4**

**Property 5: URL decoding preservation**

*For any* valid URL string, encoding it with encodeURIComponent and then decoding it with decodeURIComponent SHALL produce the original URL string.

**Validates: Requirements 7.6**

## Error Handling

### Data Fetching Errors

**Error Types**:
1. **Network Errors**: Connection failures, timeouts
2. **Authorization Errors**: User not authenticated or authorized
3. **Data Errors**: Malformed responses, missing required fields

**Error Handling Strategy**:
```typescript
try {
  // Fetch ebooks
} catch (err) {
  console.error('Error fetching ebooks:', err);
  
  // Set user-friendly error message
  if (err.message?.includes('Unauthorized')) {
    setError('You are not authorized to view these ebooks.');
  } else if (err.message?.includes('Network')) {
    setError('Network error. Please check your connection.');
  } else {
    setError('Failed to load ebooks. Please try again.');
  }
}
```

### Date Formatting Errors

**Null/Undefined Handling**:
```typescript
function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'Unknown date';
  }
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (err) {
    console.error('Date formatting error:', err);
    return 'Invalid date';
  }
}
```

### Component Error Boundaries

The component should gracefully handle errors without crashing the entire application. Error states should:
- Display user-friendly messages
- Preserve navigation functionality
- Log detailed errors for debugging
- Allow users to retry operations

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of component behavior
- Loading, error, and empty state transitions
- User interactions (navigation, clicks)
- Integration with Amplify Data client
- Edge cases (null dates, empty arrays)

**Property-Based Tests** focus on:
- Universal properties that hold for all valid inputs
- Date formatting across random date inputs
- Ebook rendering with varying data structures
- Source video rendering with different quantities
- URL encoding/decoding round trips

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference
- Tag format: `// Feature: channel-detail-integration, Property N: [property text]`

**Example Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: channel-detail-integration, Property 3: Date formatting consistency
test('formatDate produces consistent format for all valid dates', () => {
  fc.assert(
    fc.property(
      fc.date(), // Generate random dates
      (date) => {
        const formatted = formatDate(date);
        // Verify format matches "MMM DD, YYYY" pattern
        expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Component Tests** (using React Testing Library):
1. **Loading State**: Verify loading indicator appears during fetch
2. **Error State**: Verify error message displays on fetch failure
3. **Empty State**: Verify empty message when no ebooks exist
4. **Success State**: Verify ebooks render with correct data
5. **Navigation**: Verify back button calls navigate function
6. **Data Fetching**: Mock Amplify client and verify correct queries

**Utility Tests**:
1. **Date Formatting**: Test various date formats and edge cases
2. **Null Handling**: Test null and undefined inputs
3. **Invalid Dates**: Test malformed date strings

### Integration Testing

**Amplify Data Integration**:
- Mock the Amplify client to avoid real API calls
- Verify correct query filters (channelId)
- Verify relationship loading (sourceVideos)
- Test owner-based authorization behavior

### Test Coverage Goals

- **Unit Test Coverage**: 80%+ of component logic
- **Property Test Coverage**: All identified correctness properties
- **Edge Case Coverage**: All error conditions and null/undefined cases
- **Integration Coverage**: All Amplify Data interactions

## Implementation Notes

### Migration Path

1. **Create utility file** (`src/lib/utils.ts`) with formatDate function
2. **Add state management** to ChannelDetail component (ebooks, loading, error)
3. **Implement data fetching** with useEffect hook
4. **Update rendering logic** to handle loading/error/success states
5. **Remove hardcoded data** (fakeEbooks array)
6. **Test thoroughly** with unit and property tests

### Amplify Data Query Pattern

```typescript
// List ebooks for a channel
const response = await client.models.Ebook.list({
  filter: { channelId: { eq: channelId } }
});

// Load related source videos for each ebook
const ebooksWithVideos = await Promise.all(
  response.data.map(async (ebook) => {
    const videosResponse = await ebook.sourceVideos();
    return {
      ...ebook,
      sourceVideos: videosResponse.data
    };
  })
);
```

### Performance Considerations

- **Parallel Loading**: Use `Promise.all` to load source videos in parallel
- **Memoization**: Consider memoizing formatted dates if rendering many ebooks
- **Lazy Loading**: For large ebook lists, consider pagination or virtual scrolling
- **Caching**: Amplify Data client handles caching automatically

### Accessibility

- Loading indicators should have `aria-live="polite"` for screen readers
- Error messages should have `role="alert"` for immediate announcement
- Download buttons should have descriptive `aria-label` attributes
- Maintain keyboard navigation for all interactive elements

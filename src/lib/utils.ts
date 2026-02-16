/**
 * Formats a date into a human-readable string.
 * 
 * @param date - A Date object, ISO datetime string, null, or undefined
 * @returns Formatted date string in "MMM DD, YYYY" format, or fallback message
 * 
 * @example
 * formatDate(new Date('2026-02-03')) // "Feb 3, 2026"
 * formatDate('2026-02-03T10:30:00Z') // "Feb 3, 2026"
 * formatDate(null) // "Unknown date"
 * formatDate(undefined) // "Unknown date"
 * formatDate('invalid') // "Invalid date"
 */
export function formatDate(date: Date | string | null | undefined): string {
  // Handle null or undefined inputs
  if (!date) {
    return 'Unknown date';
  }

  try {
    // Convert string to Date object if necessary
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if the date is invalid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    // Format the date as "MMM DD, YYYY"
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

/**
 * Formats an ISO 8601 duration string (e.g., PT4M13S) to a human-readable format.
 * 
 * @param duration - ISO 8601 duration string, null, or undefined
 * @returns Formatted duration string (e.g., "4m 13s") or "Unknown"
 * 
 * @example
 * formatDuration('PT4M13S') // "4m 13s"
 * formatDuration('PT1H30M') // "1h 30m"
 * formatDuration('PT45S') // "45s"
 * formatDuration(null) // "Unknown"
 * formatDuration(undefined) // "Unknown"
 * formatDuration('invalid') // "invalid"
 */
export function formatDuration(duration: string | null | undefined): string {
  if (!duration) return 'Unknown';
  
  try {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  } catch {
    return duration;
  }
}

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

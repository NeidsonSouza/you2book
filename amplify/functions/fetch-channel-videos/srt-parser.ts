/**
 * Strips SRT formatting (sequence numbers, timestamps, HTML tags) from
 * caption content and returns plain text lines.
 */
export function stripSrtTimestamps(srtContent: string): string {
  const lines = srtContent.split('\n')
  const cleanLines: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Skip empty lines
    if (trimmedLine === '') {
      continue
    }

    // Skip sequence numbers (lines that are just digits)
    if (/^\d+$/.test(trimmedLine)) {
      continue
    }

    // Skip timestamp lines (format: 00:00:00,000 --> 00:00:01,000)
    if (/\d{2}:\d{2}:\d{2}/.test(trimmedLine)) {
      continue
    }

    // Remove HTML-like tags and keep the text content
    const withoutTags = trimmedLine.replace(/<[^>]+>/g, '')

    if (withoutTags.trim() !== '') {
      cleanLines.push(withoutTags.trim())
    }
  }

  return cleanLines.join('\n').trim()
}

/**
 * Strips SRT formatting (sequence numbers, timestamps, HTML tags) from
 * caption content and returns plain text lines.
 */
export function stripSrtTimestamps(srtContent: string): string {
  const lines = srtContent.split('\n')
  const cleanLines: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine === '') {
      continue
    }

    // Skip sequence numbers
    if (/^\d+$/.test(trimmedLine)) {
      continue
    }

    // Skip timestamp lines
    if (/\d{2}:\d{2}:\d{2}/.test(trimmedLine)) {
      continue
    }

    // Remove HTML-like tags
    const withoutTags = trimmedLine.replace(/<[^>]+>/g, '')

    if (withoutTags.trim() !== '') {
      cleanLines.push(withoutTags.trim())
    }
  }

  return cleanLines.join('\n').trim()
}

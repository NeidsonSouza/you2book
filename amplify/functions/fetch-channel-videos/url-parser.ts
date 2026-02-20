/**
 * Extracts a YouTube channel identifier from various URL formats.
 * Supports /channel/{ID}, /@{handle}, /c/{custom}, and /user/{username}.
 */
export function extractChannelId(url: string): string {
  try {
    const urlObj = new URL(url)

    if (!urlObj.hostname.includes('youtube.com')) {
      throw new Error("extractChannelId: Not a valid YouTube URL")
    }

    const pathname = urlObj.pathname

    // Handle different YouTube URL formats
    const channelMatch = pathname.match(/^\/channel\/([^/]+)/)
    if (channelMatch) {
      return channelMatch[1]
    }

    const handleMatch = pathname.match(/^\/@([^/]+)/)
    if (handleMatch) {
      return `@${handleMatch[1]}`
    }

    const customMatch = pathname.match(/^\/c\/([^/]+)/)
    if (customMatch) {
      return customMatch[1]
    }

    const userMatch = pathname.match(/^\/user\/([^/]+)/)
    if (userMatch) {
      return userMatch[1]
    }

    throw new Error("extractChannelId: URL does not match any supported YouTube channel format")
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("extractChannelId: Invalid YouTube channel URL format")
    }
    throw error
  }
}

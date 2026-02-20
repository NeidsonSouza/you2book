import { describe, it, expect } from 'vitest'
import { extractChannelId } from './url-parser'

describe('extractChannelId', () => {
  describe('/channel/{ID} format', () => {
    it('should extract channel ID from /channel/ URL', () => {
      const url = 'https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw'
      const result = extractChannelId(url)
      
      expect(result).toBe('UCXuqSBlHAE6Xw-yeJA0Tunw')
    })

    it('should handle /channel/ URL with query parameters', () => {
      const url = 'https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw?view_as=subscriber'
      const result = extractChannelId(url)
      
      expect(result).toBe('UCXuqSBlHAE6Xw-yeJA0Tunw')
    })
  })

  describe('/@{handle} format', () => {
    it('should extract handle from /@ URL', () => {
      const url = 'https://www.youtube.com/@LinusTechTips'
      const result = extractChannelId(url)
      
      expect(result).toBe('@LinusTechTips')
    })

    it('should handle /@ URL with query parameters', () => {
      const url = 'https://www.youtube.com/@LinusTechTips?sub_confirmation=1'
      const result = extractChannelId(url)
      
      expect(result).toBe('@LinusTechTips')
    })
  })

  describe('/c/{custom} format', () => {
    it('should extract custom name from /c/ URL', () => {
      const url = 'https://www.youtube.com/c/TechLinked'
      const result = extractChannelId(url)
      
      expect(result).toBe('TechLinked')
    })

    it('should handle /c/ URL with trailing slash', () => {
      const url = 'https://www.youtube.com/c/TechLinked/'
      const result = extractChannelId(url)
      
      expect(result).toBe('TechLinked')
    })
  })

  describe('/user/{username} format', () => {
    it('should extract username from /user/ URL', () => {
      const url = 'https://www.youtube.com/user/LinusTechTips'
      const result = extractChannelId(url)
      
      expect(result).toBe('LinusTechTips')
    })

    it('should handle /user/ URL with query parameters', () => {
      const url = 'https://www.youtube.com/user/LinusTechTips?feature=watch'
      const result = extractChannelId(url)
      
      expect(result).toBe('LinusTechTips')
    })
  })

  describe('invalid URLs', () => {
    it('should throw error for non-YouTube URL', () => {
      const url = 'https://www.example.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw'
      
      expect(() => extractChannelId(url)).toThrow('Not a valid YouTube URL')
    })

    it('should throw error for malformed URL', () => {
      const url = 'not-a-valid-url'
      
      expect(() => extractChannelId(url)).toThrow('Invalid YouTube channel URL format')
    })

    it('should throw error for YouTube URL with unsupported format', () => {
      const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      
      expect(() => extractChannelId(url)).toThrow('URL does not match any supported YouTube channel format')
    })

    it('should throw error for YouTube URL with no path', () => {
      const url = 'https://www.youtube.com/'
      
      expect(() => extractChannelId(url)).toThrow('URL does not match any supported YouTube channel format')
    })

    it('should throw error for empty string', () => {
      const url = ''
      
      expect(() => extractChannelId(url)).toThrow('Invalid YouTube channel URL format')
    })
  })

  describe('edge cases', () => {
    it('should handle youtube.com without www', () => {
      const url = 'https://youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw'
      const result = extractChannelId(url)
      
      expect(result).toBe('UCXuqSBlHAE6Xw-yeJA0Tunw')
    })

    it('should handle m.youtube.com (mobile)', () => {
      const url = 'https://m.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw'
      const result = extractChannelId(url)
      
      expect(result).toBe('UCXuqSBlHAE6Xw-yeJA0Tunw')
    })

    it('should extract channel ID with special characters', () => {
      const url = 'https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw'
      const result = extractChannelId(url)
      
      expect(result).toBe('UC-lHJZR3Gqxm24_Vd_AJ5Yw')
    })
  })
})

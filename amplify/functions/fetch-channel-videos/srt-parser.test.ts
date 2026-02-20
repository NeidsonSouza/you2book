import { describe, it, expect } from 'vitest'
import { stripSrtTimestamps } from './srt-parser'

describe('stripSrtTimestamps', () => {
  it('should strip SRT formatting from standard SRT input', () => {
    const srtInput = `1
00:00:00,000 --> 00:00:02,500
Welcome to this video

2
00:00:02,500 --> 00:00:05,000
This is the second subtitle

3
00:00:05,000 --> 00:00:08,000
And here is the third one`

    const result = stripSrtTimestamps(srtInput)
    
    expect(result).toBe('Welcome to this video\nThis is the second subtitle\nAnd here is the third one')
  })

  it('should return empty string for empty input', () => {
    const result = stripSrtTimestamps('')
    
    expect(result).toBe('')
  })

  it('should return empty string for input with only timestamps', () => {
    const srtInput = `1
00:00:00,000 --> 00:00:02,500

2
00:00:02,500 --> 00:00:05,000`

    const result = stripSrtTimestamps(srtInput)
    
    expect(result).toBe('')
  })

  it('should strip HTML tags from SRT content', () => {
    const srtInput = `1
00:00:00,000 --> 00:00:02,500
<b>Bold text</b> and <i>italic text</i>

2
00:00:02,500 --> 00:00:05,000
<font color="red">Colored text</font>`

    const result = stripSrtTimestamps(srtInput)
    
    expect(result).toBe('Bold text and italic text\nColored text')
  })

  it('should handle input with no SRT formatting', () => {
    const plainText = `This is just plain text
with multiple lines
and no SRT formatting`

    const result = stripSrtTimestamps(plainText)
    
    expect(result).toBe('This is just plain text\nwith multiple lines\nand no SRT formatting')
  })

  it('should handle mixed content with some SRT elements', () => {
    const mixedInput = `Some text before
1
00:00:00,000 --> 00:00:02,500
Actual subtitle content
More plain text`

    const result = stripSrtTimestamps(mixedInput)
    
    expect(result).toBe('Some text before\nActual subtitle content\nMore plain text')
  })

  it('should handle input with only sequence numbers', () => {
    const sequenceOnly = `1
2
3
4`

    const result = stripSrtTimestamps(sequenceOnly)
    
    expect(result).toBe('')
  })

  it('should preserve text content while removing all SRT artifacts', () => {
    const complexSrt = `1
00:00:00,000 --> 00:00:03,000
<b>First line</b> with <i>formatting</i>

2
00:00:03,000 --> 00:00:06,000
Second line without tags

3
00:00:06,000 --> 00:00:09,000
<font color="blue">Third line</font> with color`

    const result = stripSrtTimestamps(complexSrt)
    
    expect(result).toBe('First line with formatting\nSecond line without tags\nThird line with color')
  })
})

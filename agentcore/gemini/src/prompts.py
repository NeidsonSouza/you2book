"""Prompt template constants for the book generation pipeline."""

DEFAULT_VIDEO_URL = "https://www.youtube.com/watch?v=rWUWfj_PqmM"


def build_extract_prompt(video_url: str = DEFAULT_VIDEO_URL) -> str:
    """Build the extraction prompt with the given video URL."""
    return f"""Extract all the content presented in the video '{video_url}'.
List them as detailed topics, removing filler words and greetings.
Identify the 'minute:second' timestamp of each relevant topic."""

BOOK_PROMPT = """
Based on the topics extracted above, identify redundancies and group similar themes.
Create a book outline (Chapters and Subchapters) that organizes these concepts
in a logical and fluid manner, ensuring no faithful point is lost.

For each topic/subchapter, estimate:
- How many words would be needed to faithfully cover the content in fluid prose
- How many pages that would represent (assume ~250 words per page)

Include the original video timestamps that each topic covers.
""".strip()

CHAPTER_PROMPT_TEMPLATE = """
Write the content for {chapter_ref}: {topic_title}.

Chapter context: {chapter_summary}
Reference timestamps in the video: {timestamps}
{previously_covered}
Style: fluid prose, no slang, no filler words, and do not repeat concepts
already covered in previous topics. The text should read like a book written by an author,
not a transcription. Format in Markdown.

Write approximately {word_count} words to faithfully cover all the content
of this topic.
""".strip()

"""Prompt template constants for the book generation pipeline."""

DEFAULT_VIDEO_URL = "https://www.youtube.com/watch?v=rWUWfj_PqmM"


def build_extract_prompt(video_url: str = DEFAULT_VIDEO_URL) -> str:
    """Build the extraction prompt with the given video URL."""
    return f"""Extract all the content presented in the video '{video_url}'.

IMPORTANT: Extract only what is actually present in the video. Do not add information from your own knowledge or external sources.

For each topic, provide:
1. Timestamp in 'MM:SS' format
2. A concise title
3. A detailed description that captures the substantive content, including:
   - Arguments and reasoning presented
   - Examples and illustrations used
   - Data points, statistics, or specific facts mentioned
   - Relevant quotes or key phrases
   - Explanations and context provided
4. Key points: a list of discrete factual claims, examples, data points, or quotes extracted verbatim from the video content

Remove filler words and greetings, but preserve the substance and detail of what is actually said in the video.

Organize the topics into thematic parts where appropriate."""

BOOK_PROMPT = """
Use only the extracted content below. Do not add information from your own knowledge.

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

IMPORTANT: Write only from the provided content below. Do not introduce external knowledge.

Chapter context: {chapter_summary}
Reference timestamps in the video: {timestamps}

Relevant content from the video:
{relevant_content}

{previously_covered}
Style: fluid prose, no slang, no filler words, and do not repeat concepts
already covered in previous topics. The text should read like a book written by an author,
not a transcription. Format in Markdown.

Write approximately {word_count} words to faithfully cover all the content
of this topic.
""".strip()

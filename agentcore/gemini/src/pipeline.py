"""Main 3-step orchestration pipeline for book generation.

Executes: extract topics → build TOC → generate chapters.
Returns a BookOutput object for the caller to persist.
"""

from .models import BookOutput, BookTableOfContents, VideoContent, WrittenTopic, Topic
from .prompts import build_extract_prompt, BOOK_PROMPT, CHAPTER_PROMPT_TEMPLATE
from .agent import build_agent
from .formatters import print_video_content, format_video_as_text, print_table_of_contents


def _build_scoped_context(video: VideoContent, source_timestamps: list[str]) -> str:
    """Build scoped context for a chapter topic by finding matching extracted topics.
    
    Args:
        video: The full VideoContent extraction
        source_timestamps: List of timestamps that this chapter topic covers
        
    Returns:
        Formatted string containing only the relevant topics' descriptions and key_points
    """
    # Collect all topics that match the source timestamps
    relevant_topics: list[Topic] = []
    for part in video.parts:
        for topic in part.topics:
            if topic.timestamp in source_timestamps:
                relevant_topics.append(topic)
    
    # Format the relevant topics
    if not relevant_topics:
        return "(No matching content found in extraction)"
    
    lines = []
    for topic in relevant_topics:
        lines.append(f"[{topic.timestamp}] {topic.title}")
        lines.append(f"{topic.description}")
        if topic.key_points:
            lines.append("Key points:")
            for point in topic.key_points:
                lines.append(f"• {point}")
        lines.append("")  # blank line between topics
    
    return "\n".join(lines)


def run_pipeline(video_url: str) -> BookOutput:
    """Three-step pipeline: extract topics → build TOC → generate chapters."""
    # Step 1: structured extraction of video content (requires Pro model for video understanding)
    print(">>> Step 1: Extracting topics from the video...\n")
    extract_agent = build_agent("gemini-2.5-pro")
    extract_prompt = build_extract_prompt(video_url)
    response = extract_agent(extract_prompt, structured_output_model=VideoContent)
    video: VideoContent = response.structured_output
    print_video_content(video)

    # Step 2: build structured table of contents with page estimates (fresh Flash agent)
    print(">>> Step 2: Generating structured book outline...\n")
    toc_agent = build_agent("gemini-2.5-flash")
    extracted_text = format_video_as_text(video)
    full_book_prompt = f"Here are the extracted topics:\n\n{extracted_text}\n\n{BOOK_PROMPT}"
    toc_response = toc_agent(full_book_prompt, structured_output_model=BookTableOfContents)
    toc: BookTableOfContents = toc_response.structured_output
    print_table_of_contents(toc)

    # Step 3: loop over each topic and generate prose (fresh Flash agent per topic)
    print(">>> Step 3: Writing chapters...\n")
    written_topics: list[WrittenTopic] = []

    for chapter in toc.chapters:
        for topic in chapter.topics:
            chapter_ref = f"Chapter {chapter.number}, topic {topic.number}"
            print(f"  Writing {chapter_ref}: {topic.title}...")

            # Create a fresh agent for this chapter topic
            chapter_agent = build_agent("gemini-2.5-flash")

            # Build scoped context: find matching extracted topics using source timestamps
            relevant_content = _build_scoped_context(video, topic.source_timestamps)

            # Build context of previously covered topics to avoid repetition
            previously_covered = ""
            if written_topics:
                covered_titles = [f"- {wt.topic_number}. {wt.title}" for wt in written_topics]
                previously_covered = (
                    "\nTopics already written (do not repeat these concepts):\n"
                    + "\n".join(covered_titles)
                    + "\n"
                )

            prompt = CHAPTER_PROMPT_TEMPLATE.format(
                chapter_ref=chapter_ref,
                topic_title=topic.title,
                chapter_summary=chapter.summary,
                timestamps=", ".join(topic.source_timestamps),
                relevant_content=relevant_content,
                previously_covered=previously_covered,
                word_count=topic.estimated_word_count,
            )
            chapter_response = chapter_agent(prompt)
            content = str(chapter_response)

            actual_words = len(content.split())
            actual_pages = round(actual_words / 250, 1)

            written = WrittenTopic(
                chapter_number=chapter.number,
                topic_number=topic.number,
                title=topic.title,
                content=content,
                actual_word_count=actual_words,
                actual_pages=actual_pages,
            )
            written_topics.append(written)

            print(f"    → {actual_words} words, ~{actual_pages} pages")

    # Build final structured output
    total_words = sum(wt.actual_word_count for wt in written_topics)
    total_pages = round(sum(wt.actual_pages for wt in written_topics), 1)

    book = BookOutput(
        book_title=toc.book_title,
        table_of_contents=toc,
        written_topics=written_topics,
        total_word_count=total_words,
        total_pages=total_pages,
    )

    return book

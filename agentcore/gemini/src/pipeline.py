"""Main 3-step orchestration pipeline for book generation.

Executes: extract topics → build TOC → generate chapters.
Returns a BookOutput object for the caller to persist.
"""

from models import BookOutput, BookTableOfContents, VideoContent, WrittenTopic
from prompts import build_extract_prompt, BOOK_PROMPT, CHAPTER_PROMPT_TEMPLATE
from agent import build_agent
from formatters import print_video_content, format_video_as_text, print_table_of_contents


def run_pipeline(video_url: str | None = None) -> BookOutput:
    """Three-step pipeline: extract topics → build TOC → generate chapters."""
    agent = build_agent()

    # Step 1: structured extraction of video content
    print(">>> Step 1: Extracting topics from the video...\n")
    extract_prompt = build_extract_prompt(video_url) if video_url else build_extract_prompt()
    response = agent(extract_prompt, structured_output_model=VideoContent)
    video: VideoContent = response.structured_output
    print_video_content(video)

    # Step 2: build structured table of contents with page estimates
    print(">>> Step 2: Generating structured book outline...\n")
    extracted_text = format_video_as_text(video)
    full_book_prompt = f"Here are the extracted topics:\n\n{extracted_text}\n\n{BOOK_PROMPT}"
    toc_response = agent(full_book_prompt, structured_output_model=BookTableOfContents)
    toc: BookTableOfContents = toc_response.structured_output
    print_table_of_contents(toc)

    # Step 3: loop over each topic and generate prose
    print(">>> Step 3: Writing chapters...\n")
    written_topics: list[WrittenTopic] = []

    for chapter in toc.chapters:
        for topic in chapter.topics:
            chapter_ref = f"Chapter {chapter.number}, topic {topic.number}"
            print(f"  Writing {chapter_ref}: {topic.title}...")

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
                previously_covered=previously_covered,
                word_count=topic.estimated_word_count,
            )
            chapter_response = agent(prompt)
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

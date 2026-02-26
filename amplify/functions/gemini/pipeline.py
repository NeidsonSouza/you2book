"""Main 3-step orchestration pipeline for book generation.

Executes: extract topics → build TOC → generate chapters.
Handles file I/O (JSON + Markdown output).
"""

import os

from models import BookOutput, BookTableOfContents, VideoContent, WrittenTopic
from prompts import EXTRACT_PROMPT, BOOK_PROMPT, CHAPTER_PROMPT_TEMPLATE
from agent import build_agent
from formatters import print_video_content, format_video_as_text, print_table_of_contents


def run() -> None:
    """Three-step pipeline: extract topics → build TOC → generate chapters."""
    agent = build_agent()
    output_dir = os.path.dirname(__file__)

    # Step 1: structured extraction of video content
    print(">>> Step 1: Extracting topics from the video...\n")
    response = agent(EXTRACT_PROMPT, structured_output_model=VideoContent)
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

    # Save structured output as JSON
    json_path = os.path.join(output_dir, "book_output.json")
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(book.model_dump_json(indent=2))

    # Also save the full book as a single Markdown file
    md_path = os.path.join(output_dir, "book.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(f"# {book.book_title}\n\n")
        for wt in written_topics:
            f.write(f"{wt.content}\n\n---\n\n")

    print(f"\n{'=' * 60}")
    print(f"  Book generated: {book.book_title}")
    print(f"  Total: {total_words} words | ~{total_pages} pages")
    print(f"  JSON: {json_path}")
    print(f"  Markdown: {md_path}")
    print(f"{'=' * 60}")

import os

from pydantic import BaseModel, Field
from strands import Agent
from strands.models.gemini import GeminiModel


# --- Models ---


class Topic(BaseModel):
    """A single timestamped topic extracted from the video."""

    timestamp: str = Field(description="Timestamp in 'MM:SS' format indicating when the topic starts")
    title: str = Field(description="Concise title of the topic")
    description: str = Field(
        description="Detailed description of the topic content, without filler words or greetings"
    )


class VideoPart(BaseModel):
    """A thematic section of the video containing related topics."""

    part_number: int = Field(description="Sequential number of this part")
    title: str = Field(description="Title summarizing the theme of this part")
    topics: list[Topic] = Field(description="List of timestamped topics within this part")


class VideoContent(BaseModel):
    """Structured extraction of a YouTube video's content."""

    video_title: str = Field(description="Title of the YouTube video")
    video_url: str = Field(description="URL of the YouTube video")
    parts: list[VideoPart] = Field(description="Thematic parts the video content is organized into")


class BookTopic(BaseModel):
    """A topic (subsection) within a book chapter."""

    number: str = Field(description="Topic number, e.g. '1.1'")
    title: str = Field(description="Title of the topic")
    source_timestamps: list[str] = Field(description="Original video timestamps covered by this topic")
    estimated_word_count: int = Field(
        description="Estimated number of words needed to faithfully cover this topic in prose"
    )
    estimated_pages: float = Field(
        description="Estimated number of pages (assuming ~250 words per page)"
    )


class WrittenTopic(BaseModel):
    """Result of writing a single topic, with actual metrics."""

    chapter_number: int = Field(description="Chapter this topic belongs to")
    topic_number: str = Field(description="Topic number, e.g. '1.1'")
    title: str = Field(description="Topic title")
    content: str = Field(description="Generated Markdown prose")
    actual_word_count: int = Field(description="Actual number of words written")
    actual_pages: float = Field(description="Actual pages (word_count / 250)")


class BookChapter(BaseModel):
    """A chapter in the book's table of contents."""

    number: int = Field(description="Chapter number")
    title: str = Field(description="Chapter title")
    summary: str = Field(description="Brief description of what this chapter covers")
    topics: list[BookTopic] = Field(description="Subsections within this chapter")


class BookTableOfContents(BaseModel):
    """Structured table of contents for a book derived from video content."""

    book_title: str = Field(description="Title of the book")
    chapters: list[BookChapter] = Field(description="Ordered list of chapters")


class BookOutput(BaseModel):
    """Complete structured output of the book generation pipeline."""

    book_title: str = Field(description="Title of the book")
    table_of_contents: BookTableOfContents = Field(description="Structured TOC with estimates")
    written_topics: list[WrittenTopic] = Field(description="All generated topic content with metrics")
    total_word_count: int = Field(description="Sum of all actual word counts")
    total_pages: float = Field(description="Sum of all actual pages")


# --- Prompts ---

EXTRACT_PROMPT = """
Extract all the content presented in the video 'Elon Musk : How to Build the Future' (https://www.youtube.com/watch?v=tnBQmEqBCY0).
List them as detailed topics, removing filler words and greetings.
Identify the 'minute:second' timestamp of each relevant topic.
""".strip()

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


# --- Agent setup ---


def build_agent() -> Agent:
    """Create and return a configured Strands Agent with the Gemini model."""
    model = GeminiModel(
        client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
        model_id="gemini-3-flash-preview",
    )
    return Agent(model=model)


# --- Display helpers ---


def print_video_content(video: VideoContent) -> None:
    """Print the extracted video content in a human-readable format."""
    print(f"{video.video_title}")
    print(f"{video.video_url}\n")
    for part in video.parts:
        print(f"Part {part.part_number}: {part.title}")
        for topic in part.topics:
            print(f"  [{topic.timestamp}] {topic.title}: {topic.description}")
        print()


def format_video_as_text(video: VideoContent) -> str:
    """Serialize VideoContent to a readable text block for use as agent context."""
    lines = [f"# {video.video_title}", f"{video.video_url}", ""]
    for part in video.parts:
        lines.append(f"## Part {part.part_number}: {part.title}")
        for topic in part.topics:
            lines.append(f"- [{topic.timestamp}] {topic.title}: {topic.description}")
        lines.append("")
    return "\n".join(lines)


def print_table_of_contents(toc: BookTableOfContents) -> None:
    """Print the book table of contents with page estimates."""
    print(f"\n{'=' * 60}")
    print(f"  {toc.book_title}")
    print(f"{'=' * 60}\n")

    total_words = 0
    total_pages = 0.0

    for chapter in toc.chapters:
        print(f"Chapter {chapter.number}: {chapter.title}")
        print(f"  {chapter.summary}")
        for topic in chapter.topics:
            print(f"  {topic.number}. {topic.title}")
            print(f"       ~{topic.estimated_word_count} words | ~{topic.estimated_pages:.1f} pages")
            print(f"       Timestamps: {', '.join(topic.source_timestamps)}")
            total_words += topic.estimated_word_count
            total_pages += topic.estimated_pages
        print()

    print(f"{'─' * 60}")
    print(f"Estimated total: ~{total_words} words | ~{total_pages:.1f} pages")
    print(f"{'─' * 60}\n")


# --- Main pipeline ---


def main() -> None:
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


if __name__ == "__main__":
    main()

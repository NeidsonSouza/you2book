"""Display and formatting helper functions.

Contains functions for printing and serializing video content
and book table of contents. No agent invocations or pipeline logic.
"""

from .models import BookTableOfContents, VideoContent


def print_video_content(video: VideoContent) -> None:
    """Print the extracted video content in a human-readable format."""
    print(f"{video.video_title}")
    print(f"{video.video_url}\n")
    for part in video.parts:
        print(f"Part {part.part_number}: {part.title}")
        for topic in part.topics:
            print(f"  [{topic.timestamp}] {topic.title}: {topic.description}")
            if topic.key_points:
                print("    Key points:")
                for point in topic.key_points:
                    print(f"    • {point}")
        print()


def format_video_as_text(video: VideoContent) -> str:
    """Serialize VideoContent to a readable text block for use as agent context."""
    lines = [f"# {video.video_title}", f"{video.video_url}", ""]
    for part in video.parts:
        lines.append(f"## Part {part.part_number}: {part.title}")
        for topic in part.topics:
            lines.append(f"- [{topic.timestamp}] {topic.title}: {topic.description}")
            if topic.key_points:
                lines.append("  Key points:")
                for point in topic.key_points:
                    lines.append(f"  • {point}")
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

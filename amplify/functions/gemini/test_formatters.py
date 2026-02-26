"""Unit tests for formatters module.

**Validates: Requirements 4.1, 7.1**

Verifies that format_video_as_text produces the expected markdown-style
text output for a sample VideoContent instance.
"""

from formatters import format_video_as_text
from models import Topic, VideoContent, VideoPart


def test_format_video_as_text_produces_expected_output() -> None:
    """format_video_as_text should serialize VideoContent into a readable text block."""
    video = VideoContent(
        video_title="Test Video Title",
        video_url="https://www.youtube.com/watch?v=abc123",
        parts=[
            VideoPart(
                part_number=1,
                title="Introduction",
                topics=[
                    Topic(timestamp="0:00", title="Welcome", description="Opening remarks"),
                    Topic(timestamp="1:30", title="Overview", description="High-level summary"),
                ],
            ),
            VideoPart(
                part_number=2,
                title="Deep Dive",
                topics=[
                    Topic(timestamp="5:00", title="Architecture", description="System design details"),
                    Topic(timestamp="10:15", title="Performance", description="Optimization techniques"),
                ],
            ),
        ],
    )

    result = format_video_as_text(video)

    expected = "\n".join([
        "# Test Video Title",
        "https://www.youtube.com/watch?v=abc123",
        "",
        "## Part 1: Introduction",
        "- [0:00] Welcome: Opening remarks",
        "- [1:30] Overview: High-level summary",
        "",
        "## Part 2: Deep Dive",
        "- [5:00] Architecture: System design details",
        "- [10:15] Performance: Optimization techniques",
        "",
    ])

    assert result == expected

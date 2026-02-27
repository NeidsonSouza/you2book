"""Property test for model field preservation.

**Feature: gemini-refactor, Property 1: Model field preservation**
**Validates: Requirements 7.2**

Verifies that for any Pydantic model in the refactored Models_Module,
the model's model_fields (field names, types, and descriptions) are
identical to the corresponding model in the original main.py.
"""

from typing import get_args, get_origin

import hypothesis.strategies as st
from hypothesis import given, settings
from pydantic import BaseModel

from models import (
    BookChapter,
    BookOutput,
    BookTableOfContents,
    BookTopic,
    Topic,
    VideoPart,
    VideoContent,
    WrittenTopic,
)

# Reference dict capturing the original model definitions from main.py.
# Each entry maps model_name -> { field_name: (annotation, description) }
ORIGINAL_MODELS: dict[str, dict[str, tuple[type, str]]] = {
    "Topic": {
        "timestamp": (str, "Timestamp in 'MM:SS' format indicating when the topic starts"),
        "title": (str, "Concise title of the topic"),
        "description": (str, "Detailed description of the topic content, without filler words or greetings"),
    },
    "VideoPart": {
        "part_number": (int, "Sequential number of this part"),
        "title": (str, "Title summarizing the theme of this part"),
        "topics": (list[Topic], "List of timestamped topics within this part"),
    },
    "VideoContent": {
        "video_title": (str, "Title of the YouTube video"),
        "video_url": (str, "URL of the YouTube video"),
        "parts": (list[VideoPart], "Thematic parts the video content is organized into"),
    },
    "BookTopic": {
        "number": (str, "Topic number, e.g. '1.1'"),
        "title": (str, "Title of the topic"),
        "source_timestamps": (list[str], "Original video timestamps covered by this topic"),
        "estimated_word_count": (int, "Estimated number of words needed to faithfully cover this topic in prose"),
        "estimated_pages": (float, "Estimated number of pages (assuming ~250 words per page)"),
    },
    "WrittenTopic": {
        "chapter_number": (int, "Chapter this topic belongs to"),
        "topic_number": (str, "Topic number, e.g. '1.1'"),
        "title": (str, "Topic title"),
        "content": (str, "Generated Markdown prose"),
        "actual_word_count": (int, "Actual number of words written"),
        "actual_pages": (float, "Actual pages (word_count / 250)"),
    },
    "BookChapter": {
        "number": (int, "Chapter number"),
        "title": (str, "Chapter title"),
        "summary": (str, "Brief description of what this chapter covers"),
        "topics": (list[BookTopic], "Subsections within this chapter"),
    },
    "BookTableOfContents": {
        "book_title": (str, "Title of the book"),
        "chapters": (list[BookChapter], "Ordered list of chapters"),
    },
    "BookOutput": {
        "book_title": (str, "Title of the book"),
        "table_of_contents": (BookTableOfContents, "Structured TOC with estimates"),
        "written_topics": (list[WrittenTopic], "All generated topic content with metrics"),
        "total_word_count": (int, "Sum of all actual word counts"),
        "total_pages": (float, "Sum of all actual pages"),
    },
}

ALL_MODELS: list[type[BaseModel]] = [
    Topic,
    VideoPart,
    VideoContent,
    BookTopic,
    WrittenTopic,
    BookChapter,
    BookTableOfContents,
    BookOutput,
]


def _normalize_annotation(annotation: type) -> tuple:
    """Normalize a type annotation into a comparable tuple form."""
    origin = get_origin(annotation)
    if origin is not None:
        return (origin, get_args(annotation))
    return (annotation, ())


@given(model_cls=st.sampled_from(ALL_MODELS))
@settings(max_examples=100)
def test_model_field_preservation(model_cls: type[BaseModel]) -> None:
    """**Validates: Requirements 7.2**

    For any Pydantic model in the refactored Models_Module, the model's
    model_fields (field names, types, and descriptions) are identical to
    the corresponding model in the original main.py.
    """
    model_name = model_cls.__name__
    assert model_name in ORIGINAL_MODELS, f"Model {model_name} not found in original reference"

    expected_fields = ORIGINAL_MODELS[model_name]
    actual_fields = model_cls.model_fields

    # Field names must match exactly
    assert set(actual_fields.keys()) == set(expected_fields.keys()), (
        f"{model_name}: field names differ. "
        f"Expected {set(expected_fields.keys())}, got {set(actual_fields.keys())}"
    )

    for field_name, (expected_type, expected_desc) in expected_fields.items():
        field_info = actual_fields[field_name]

        # Type annotations must match
        actual_annotation = field_info.annotation
        assert _normalize_annotation(actual_annotation) == _normalize_annotation(expected_type), (
            f"{model_name}.{field_name}: type mismatch. "
            f"Expected {expected_type}, got {actual_annotation}"
        )

        # Field descriptions must match
        assert field_info.description == expected_desc, (
            f"{model_name}.{field_name}: description mismatch. "
            f"Expected {expected_desc!r}, got {field_info.description!r}"
        )

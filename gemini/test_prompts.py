"""Unit tests verifying prompt template strings match the originals character-for-character.

Validates: Requirements 7.3, 2.1, 2.2
"""

from prompts import EXTRACT_PROMPT, BOOK_PROMPT, CHAPTER_PROMPT_TEMPLATE


# Original prompt strings copied verbatim from the pre-refactor main.py
# to serve as ground-truth references for character-for-character comparison.

ORIGINAL_EXTRACT_PROMPT = (
    "Extract all the content presented in the video 'Elon Musk : How to Build the Future' "
    "(https://www.youtube.com/watch?v=tnBQmEqBCY0).\n"
    "List them as detailed topics, removing filler words and greetings.\n"
    "Identify the 'minute:second' timestamp of each relevant topic."
)

ORIGINAL_BOOK_PROMPT = (
    "Based on the topics extracted above, identify redundancies and group similar themes.\n"
    "Create a book outline (Chapters and Subchapters) that organizes these concepts\n"
    "in a logical and fluid manner, ensuring no faithful point is lost.\n"
    "\n"
    "For each topic/subchapter, estimate:\n"
    "- How many words would be needed to faithfully cover the content in fluid prose\n"
    "- How many pages that would represent (assume ~250 words per page)\n"
    "\n"
    "Include the original video timestamps that each topic covers."
)

ORIGINAL_CHAPTER_PROMPT_TEMPLATE = (
    "Write the content for {chapter_ref}: {topic_title}.\n"
    "\n"
    "Chapter context: {chapter_summary}\n"
    "Reference timestamps in the video: {timestamps}\n"
    "{previously_covered}\n"
    "Style: fluid prose, no slang, no filler words, and do not repeat concepts\n"
    "already covered in previous topics. The text should read like a book written by an author,\n"
    "not a transcription. Format in Markdown.\n"
    "\n"
    "Write approximately {word_count} words to faithfully cover all the content\n"
    "of this topic."
)


def test_extract_prompt_matches_original() -> None:
    """EXTRACT_PROMPT in prompts.py matches the original from main.py."""
    assert EXTRACT_PROMPT == ORIGINAL_EXTRACT_PROMPT


def test_book_prompt_matches_original() -> None:
    """BOOK_PROMPT in prompts.py matches the original from main.py."""
    assert BOOK_PROMPT == ORIGINAL_BOOK_PROMPT


def test_chapter_prompt_template_matches_original() -> None:
    """CHAPTER_PROMPT_TEMPLATE in prompts.py matches the original from main.py."""
    assert CHAPTER_PROMPT_TEMPLATE == ORIGINAL_CHAPTER_PROMPT_TEMPLATE


def test_prompts_module_has_no_internal_imports() -> None:
    """prompts.py contains only string constants with zero internal imports."""
    import importlib
    import inspect

    source = inspect.getsource(importlib.import_module("prompts"))
    # Should not import from any sibling module
    assert "from models" not in source
    assert "from agent" not in source
    assert "from formatters" not in source
    assert "from pipeline" not in source
    assert "import models" not in source

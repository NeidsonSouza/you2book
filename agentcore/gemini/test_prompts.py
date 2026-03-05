"""Unit tests verifying prompt template strings contain required content.

Validates: Requirements 3.1, 3.2, 3.3, 5.1, 6.1
"""

from src.prompts import build_extract_prompt, DEFAULT_VIDEO_URL, BOOK_PROMPT, CHAPTER_PROMPT_TEMPLATE


def test_extract_prompt_contains_substance_extraction_instructions() -> None:
    """Extraction prompt instructs model to extract detailed substance."""
    prompt = build_extract_prompt()
    
    # Verify instructions for rich extraction (Req 3.1)
    assert "detailed description" in prompt.lower()
    assert "arguments" in prompt.lower() or "reasoning" in prompt.lower()
    assert "examples" in prompt.lower()
    assert "data points" in prompt.lower() or "facts" in prompt.lower()
    assert "quotes" in prompt.lower()
    assert "explanations" in prompt.lower()


def test_extract_prompt_contains_key_points_instruction() -> None:
    """Extraction prompt instructs model to populate key_points field."""
    prompt = build_extract_prompt()
    
    # Verify key_points instruction (Req 3.2)
    assert "key points" in prompt.lower() or "key_points" in prompt.lower()
    assert "discrete" in prompt.lower() or "factual claims" in prompt.lower()


def test_extract_prompt_contains_grounding_constraint() -> None:
    """Extraction prompt contains grounding constraint."""
    prompt = build_extract_prompt()
    
    # Verify grounding constraint (Req 3.3)
    assert "extract only" in prompt.lower() or "only what is" in prompt.lower()
    assert "video" in prompt.lower()
    assert "do not add" in prompt.lower() or "not add information" in prompt.lower()
    assert "own knowledge" in prompt.lower() or "external" in prompt.lower()


def test_extract_prompt_custom_url() -> None:
    """build_extract_prompt() substitutes a custom URL into the prompt."""
    custom_url = "https://www.youtube.com/watch?v=custom123"
    result = build_extract_prompt(custom_url)
    assert custom_url in result
    assert DEFAULT_VIDEO_URL not in result


def test_book_prompt_contains_grounding_constraint() -> None:
    """BOOK_PROMPT contains grounding constraint."""
    # Verify grounding constraint (Req 5.1)
    assert "use only" in BOOK_PROMPT.lower() or "only the extracted" in BOOK_PROMPT.lower()
    assert "do not add" in BOOK_PROMPT.lower() or "not add information" in BOOK_PROMPT.lower()
    assert "own knowledge" in BOOK_PROMPT.lower() or "external" in BOOK_PROMPT.lower()


def test_book_prompt_contains_toc_instructions() -> None:
    """BOOK_PROMPT contains instructions for TOC generation."""
    assert "outline" in BOOK_PROMPT.lower() or "chapters" in BOOK_PROMPT.lower()
    assert "organize" in BOOK_PROMPT.lower()
    assert "timestamps" in BOOK_PROMPT.lower()


def test_chapter_prompt_template_contains_grounding_constraint() -> None:
    """CHAPTER_PROMPT_TEMPLATE contains grounding constraint."""
    # Verify grounding constraint (Req 6.1)
    assert "write only" in CHAPTER_PROMPT_TEMPLATE.lower() or "only from the provided" in CHAPTER_PROMPT_TEMPLATE.lower()
    assert "do not introduce" in CHAPTER_PROMPT_TEMPLATE.lower() or "not introduce external" in CHAPTER_PROMPT_TEMPLATE.lower()
    assert "external knowledge" in CHAPTER_PROMPT_TEMPLATE.lower()


def test_chapter_prompt_template_contains_relevant_content_placeholder() -> None:
    """CHAPTER_PROMPT_TEMPLATE contains relevant_content placeholder."""
    # Verify relevant_content placeholder (Req 6.2)
    assert "{relevant_content}" in CHAPTER_PROMPT_TEMPLATE


def test_chapter_prompt_template_contains_required_placeholders() -> None:
    """CHAPTER_PROMPT_TEMPLATE contains all required placeholders."""
    # Verify all required placeholders (Req 6.2, 6.3, 6.4)
    assert "{chapter_ref}" in CHAPTER_PROMPT_TEMPLATE
    assert "{topic_title}" in CHAPTER_PROMPT_TEMPLATE
    assert "{chapter_summary}" in CHAPTER_PROMPT_TEMPLATE
    assert "{timestamps}" in CHAPTER_PROMPT_TEMPLATE
    assert "{previously_covered}" in CHAPTER_PROMPT_TEMPLATE
    assert "{word_count}" in CHAPTER_PROMPT_TEMPLATE


def test_prompts_module_has_no_internal_imports() -> None:
    """prompts.py contains only string constants and functions with zero internal imports."""
    import importlib
    import inspect

    source = inspect.getsource(importlib.import_module("src.prompts"))
    # Should not import from any sibling module
    assert "from models" not in source
    assert "from agent" not in source
    assert "from formatters" not in source
    assert "from pipeline" not in source
    assert "import models" not in source

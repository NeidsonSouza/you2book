"""Property test for function signature preservation.

**Feature: gemini-refactor, Property 2: Function signature preservation**
**Validates: Requirements 7.1**

Verifies that for any public function in the refactored package
(build_agent, print_video_content, format_video_as_text,
print_table_of_contents, run), the function's parameter names and
type annotations match the original signatures.
"""

import inspect
from collections.abc import Callable
from typing import Any

import hypothesis.strategies as st
from hypothesis import given, settings

from agent import build_agent
from formatters import format_video_as_text, print_table_of_contents, print_video_content
from pipeline import run

# Reference dict capturing the original function signatures from main.py.
# Each entry maps function_ref -> { "params": { name: annotation }, "return": annotation }
# inspect.Parameter.empty is used for parameters with no annotation.
ORIGINAL_SIGNATURES: dict[Callable[..., Any], dict[str, Any]] = {
    build_agent: {
        "params": {},
        "return": "Agent",
    },
    print_video_content: {
        "params": {"video": "VideoContent"},
        "return": None,
    },
    format_video_as_text: {
        "params": {"video": "VideoContent"},
        "return": str,
    },
    print_table_of_contents: {
        "params": {"toc": "BookTableOfContents"},
        "return": None,
    },
    run: {
        "params": {},
        "return": None,
    },
}

ALL_FUNCTIONS: list[Callable[..., Any]] = list(ORIGINAL_SIGNATURES.keys())


def _normalize_annotation(annotation: Any) -> Any:
    """Normalize an annotation for comparison.

    Converts class references to their string name so that forward
    references and direct class references compare equally.
    """
    if annotation is inspect.Parameter.empty:
        return inspect.Parameter.empty
    if isinstance(annotation, type):
        return annotation.__name__
    if isinstance(annotation, str):
        return annotation
    return annotation


@given(func=st.sampled_from(ALL_FUNCTIONS))
@settings(max_examples=100)
def test_function_signature_preservation(func: Callable[..., Any]) -> None:
    """**Validates: Requirements 7.1**

    For any public function in the refactored package, the function's
    parameter names and type annotations match the original signatures.
    """
    expected = ORIGINAL_SIGNATURES[func]
    sig = inspect.signature(func)

    # Check parameter names match
    actual_params = {
        name: param
        for name, param in sig.parameters.items()
        if name != "self"
    }
    assert set(actual_params.keys()) == set(expected["params"].keys()), (
        f"{func.__name__}: parameter names differ. "
        f"Expected {set(expected['params'].keys())}, got {set(actual_params.keys())}"
    )

    # Check parameter type annotations match
    for param_name, expected_annotation in expected["params"].items():
        actual_annotation = actual_params[param_name].annotation
        assert _normalize_annotation(actual_annotation) == _normalize_annotation(expected_annotation), (
            f"{func.__name__}({param_name}): type annotation mismatch. "
            f"Expected {expected_annotation}, got {actual_annotation}"
        )

    # Check return type annotation matches
    actual_return = sig.return_annotation
    expected_return = expected["return"]
    if actual_return is inspect.Signature.empty and expected_return is None:
        pass  # Both indicate no return type — equivalent
    else:
        assert _normalize_annotation(actual_return) == _normalize_annotation(expected_return), (
            f"{func.__name__}: return type mismatch. "
            f"Expected {expected_return}, got {actual_return}"
        )

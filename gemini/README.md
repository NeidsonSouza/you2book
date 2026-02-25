# Gemini Book Generator

AI-powered book generation from YouTube video content using Google's Gemini model via the [Strands Agents SDK](https://github.com/strands-agents/sdk-python).

## Package Structure

```
gemini/
├── __init__.py          # Package marker
├── main.py              # Thin entry point — calls pipeline.run()
├── models.py            # All 8 Pydantic model classes
├── prompts.py           # 3 prompt template constants
├── agent.py             # build_agent() factory function
├── formatters.py        # 3 display/formatting helper functions
├── pipeline.py          # Main 3-step orchestration pipeline
├── pyproject.toml       # Project configuration (uv)
├── README.md            # This file
├── .python-version      # Python version
└── uv.lock              # Lock file
```

## Modules

### models.py

All Pydantic v2 data models used throughout the pipeline:

- `Topic`, `VideoPart`, `VideoContent` — represent extracted video structure
- `BookTopic`, `WrittenTopic`, `BookChapter`, `BookTableOfContents`, `BookOutput` — represent the generated book structure

### prompts.py

Three prompt template constants used by the pipeline steps:

- `EXTRACT_PROMPT` — instructs the agent to extract topics from a YouTube video
- `BOOK_PROMPT` — instructs the agent to build a table of contents from extracted topics
- `CHAPTER_PROMPT_TEMPLATE` — template for generating individual chapter content

No internal imports — pure string constants.

### agent.py

`build_agent()` factory function that creates a configured Strands Agent with the Gemini model. Reads `GOOGLE_API_KEY` from the environment.

### formatters.py

Display and text formatting helpers:

- `print_video_content(video)` — prints extracted video content to stdout
- `format_video_as_text(video)` — converts a `VideoContent` instance to a plain text string
- `print_table_of_contents(toc)` — prints a `BookTableOfContents` to stdout

### pipeline.py

Main `run()` function that orchestrates the three-step pipeline:

1. Extract topics from video transcripts
2. Build a table of contents from extracted topics
3. Generate chapter content for each topic

Handles file I/O — writes `book_output.json` and `book.md`.

### main.py

Thin entry point that imports and calls `pipeline.run()`. Run with:

```bash
uv run python main.py
```

## Setup

```bash
cd gemini
uv sync
```

Set your API key:

```bash
export GOOGLE_API_KEY="your-key-here"
```

## Usage

```bash
uv run python main.py
```

Output files are written to the `gemini/` directory:

- `book_output.json` — structured JSON output
- `book.md` — formatted Markdown book

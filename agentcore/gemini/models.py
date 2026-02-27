from pydantic import BaseModel, Field


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

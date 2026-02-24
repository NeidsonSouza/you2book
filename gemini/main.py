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


# --- Agent setup ---

PROMPT = """
Extraia todo o conteúdo apresentado no vídeo 'Elon Musk : How to Build the Future' (https://www.youtube.com/watch?v=tnBQmEqBCY0).
Liste-os em tópicos detalhados, removendo muletas de linguagem e saudações.
Identifique o 'minuto:segundo' de cada tópico relevante
""".strip()


def build_agent() -> Agent:
    """Create and return a configured Strands Agent with the Gemini model."""
    model = GeminiModel(
        client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
        model_id="gemini-3-flash-preview",
    )
    return Agent(model=model)


def print_video_content(video: VideoContent) -> None:
    """Print the extracted video content in a human-readable format."""
    print(f"{video.video_title}")
    print(f"{video.video_url}\n")
    for part in video.parts:
        print(f"Parte {part.part_number}: {part.title}")
        for topic in part.topics:
            print(f"[{topic.timestamp}] {topic.title}: {topic.description}")
        print()


def main() -> None:
    """Extract and display structured content from a YouTube video."""
    agent = build_agent()
    response = agent(PROMPT, structured_output_model=VideoContent)

    video: VideoContent = response.structured_output
    print_video_content(video)


if __name__ == "__main__":
    main()

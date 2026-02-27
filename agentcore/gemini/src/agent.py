import os

from strands import Agent
from strands.models.gemini import GeminiModel


def build_agent() -> Agent:
    """Create and return a configured Strands Agent with the Gemini model."""
    model = GeminiModel(
        client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
        model_id="gemini-3-flash-preview",
    )
    return Agent(model=model)

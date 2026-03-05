import os

from strands import Agent
from strands.models.gemini import GeminiModel


def build_agent(model_id: str = "gemini-2.5-pro") -> Agent:
    """Create and return a configured Strands Agent with the Gemini model."""
    model = GeminiModel(
        client_args={"api_key": os.getenv("GOOGLE_API_KEY")},
        model_id=model_id,
    )
    return Agent(model=model)

from strands import Agent
from strands.models.gemini import GeminiModel
import os


def main():
    # Initialize the client (it will automatically look for a GEMINI_API_KEY env var)
    # Or pass it explicitly: client = genai.Client(api_key="YOUR_API_KEY")
    model = GeminiModel(
        client_args={
            "api_key": os.getenv("GOOGLE_API_KEY")
        },
        model_id="gemini-3-flash-preview",
        )

    agent = Agent(model=model)
    response = agent("""
Extraia todo o conteúdo apresentado no vídeo 'Elon Musk : How to Build the Future' (https://www.youtube.com/watch?v=tnBQmEqBCY0).
Liste-os em tópicos detalhados, removendo muletas de linguagem e saudações.
Identifique o 'minuto:segundo' de cada tópico relevante
        """)
    print(response)


if __name__ == "__main__":
    main()

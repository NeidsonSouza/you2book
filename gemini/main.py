from google import genai


def main():
    # Initialize the client (it will automatically look for a GEMINI_API_KEY env var)
    # Or pass it explicitly: client = genai.Client(api_key="YOUR_API_KEY")
    client = genai.Client()

    response = client.models.generate_content(
        model="gemini-3-flash-preview", 
        contents="""
        Extraia todo o conteúdo apresentado no vídeo 'Elon Musk : How to Build the Future' (https://www.youtube.com/watch?v=tnBQmEqBCY0).
        Liste-os em tópicos detalhados, removendo muletas de linguagem e saudações.
        Identifique o 'minuto:segundo' de cada tópico relevante
        """
    )

    print(response.text)


if __name__ == "__main__":
    main()

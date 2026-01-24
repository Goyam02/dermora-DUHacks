from openai import AsyncAzureOpenAI
from app.core.config import settings

client = AsyncAzureOpenAI(
    api_key=settings.AZURE_WHISPER_KEY,
    azure_endpoint=settings.AZURE_WHISPER_URI,
    api_version=settings.AZURE_OPENAI_API_VERSION,
)


async def transcribe_audio(audio_path: str) -> str:
    """
    Batch transcription using Azure OpenAI Whisper.
    """

    with open(audio_path, "rb") as audio_file:
        response = await client.audio.transcriptions.create(
            file=audio_file,
            model="whisper",
            response_format="text",
        )

    return response.strip()
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    DEBUG: bool = False  

    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_DEPLOYMENT: str
    AZURE_OPENAI_API_VERSION: str = "2024-06-01"
    # Azure Speech Configuration
    AZURE_SPEECH_KEY: str
    AZURE_SPEECH_REGION: str
    # Azure Whisper Configuration
    AZURE_WHISPER_URI: str
    AZURE_WHISPER_KEY: str

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from .env (like VITE_ prefixed vars for frontend)


settings = Settings()


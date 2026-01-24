from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    DEBUG: bool = False  

    # Azure OpenAI Configuration
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_DEPLOYMENT: str
    AZURE_OPENAI_API_VERSION: str = "2024-06-01"

    class Config:
        env_file = ".env"


settings = Settings()


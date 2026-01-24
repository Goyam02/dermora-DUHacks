# ============================================================================
# FILE: backend/app/services/llm_client.py
# ============================================================================

import json
from typing import Dict

from openai import AsyncAzureOpenAI

from app.core.config import settings


class LLMClient:
    """
    Thin Azure OpenAI client abstraction.
    JSON-only output, async-safe.
    """

    def __init__(self):
        self.client = AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
        )

        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT
        self.temperature = 0.0

    async def generate_json(self, prompt: str) -> Dict:
        """
        Send a prompt to Azure OpenAI and return parsed JSON.
        Raises ValueError if output is invalid JSON.
        """

        response = await self.client.chat.completions.create(
            model=self.deployment,
            temperature=self.temperature,
            messages=[
                {
                    "role": "system",
                    "content": "You are a system that returns ONLY valid JSON.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            raise ValueError(
                f"Invalid JSON returned by Azure OpenAI: {content}"
            )

# ============================================================================
# FILE: backend/app/services/mood_inference_service.py
# ============================================================================

from datetime import datetime
from typing import Dict, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.entities.mood_log import MoodLog
from app.utils.llm_client import LLMClient
from app.utils.stt import transcribe_audio


class MoodInferenceService:
    """
    Audio → STT → LLM → MoodLog
    Simple and explicit.
    """

    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    @staticmethod
    def _build_prompt(user_text: str) -> str:
        return f"""You are an emotion analysis system.

Analyze ONLY the emotional state of the human user
based on the following text.

Return numeric scores from 0 to 100.

Definitions:
- stress: mental pressure, overload, tension
- anxiety: worry, nervous anticipation, fear
- sadness: low mood, hopelessness, emotional pain
- energy: motivation, engagement, vitality
- mood: overall emotional well-being

Text:
\"\"\"
{user_text}
\"\"\"

Return JSON only in this exact format:
{{
  "stress": number,
  "anxiety": number,
  "sadness": number,
  "energy": number
}}
"""

    @staticmethod
    def _safe_score(value) -> float:
        try:
            return max(0.0, min(100.0, float(value)))
        except (TypeError, ValueError):
            return 50.0

    @staticmethod
    def _compute_mood_score(
        stress: float,
        anxiety: float,
        sadness: float,
        energy: float,
        mood: float = 0.0,
    ) -> float:
        # Invert negative emotions
        negative = (
            0.4 * stress +
            0.3 * anxiety +
            0.3 * sadness
        )
        mood = 100 - negative + 0.5 * energy + 0.2 * mood
        return max(0.0, min(100.0, mood))

    async def process_conversation_audio(
        self,
        db: AsyncSession,
        user_id: UUID,
        audio_path: str,
    ) -> Optional[MoodLog]:
        """
        End-to-end pipeline:
        audio → STT → mood inference → DB
        """

        # 1. Speech to text
        transcript = await transcribe_audio(audio_path)

        if not transcript or not transcript.strip():
            return None

        # 2. LLM emotion inference
        prompt = self._build_prompt(transcript)
        llm_response: Dict = await self.llm.generate_json(prompt)

        stress = self._safe_score(llm_response.get("stress"))
        anxiety = self._safe_score(llm_response.get("anxiety"))
        sadness = self._safe_score(llm_response.get("sadness"))
        energy = self._safe_score(llm_response.get("energy"))
        mood = self._safe_score(llm_response.get("mood"))

        mood_score = self._compute_mood_score(
            stress=stress,
            anxiety=anxiety,
            sadness=sadness,
            energy=energy,
            mood=mood
        )

        # 3. Persist
        mood_log = MoodLog(
            user_id=user_id,
            mood_score=mood_score,
            stress=stress,
            anxiety=anxiety,
            sadness=sadness,
            energy=energy,
            mood_score=mood,
            logged_at=datetime.utcnow(),
        )

        db.add(mood_log)
        await db.commit()
        await db.refresh(mood_log)

        return mood_log

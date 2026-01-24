import os
import uuid
import shutil
import tempfile
from fastapi import File, UploadFile
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.services.voice_prompt_selector import VoicePromptSelector
from app.services.mood_inference_service import MoodInferenceService
from app.utils.llm_client import LLMClient

router = APIRouter(prefix="/voice", tags=["Voice Agent"])
prompt_selector = VoicePromptSelector()


def _save_temp_audio(file: UploadFile) -> str:
    suffix = os.path.splitext(file.filename)[-1] or ".wav"
    filename = f"{uuid.uuid4()}{suffix}"

    temp_dir = tempfile.gettempdir()  # Windows / Linux / macOS safe
    path = os.path.join(temp_dir, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return path


@router.get("/prompt/{user_id}")
async def get_voice_prompt(
    user_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get appropriate system prompt for Gemini voice agent based on user's mood.
    
    - **user_id**: User UUID
    
    Returns:
    - mood_category: Current mood classification
    - mood_score: Average mood score (0-100)
    - system_prompt: Full prompt to send to Gemini Live API
    - suggested_duration: Recommended conversation length
    - follow_up_recommended: Whether to suggest another session
    
    **Frontend Usage:**
    1. Call this endpoint before starting voice session
    2. Pass system_prompt to Gemini Live API configuration
    3. Start voice conversation with returned prompt
    """
    
    try:
        prompt_data = await prompt_selector.get_prompt_for_user(db, user_id)
        return prompt_data
    except Exception as e:
        # Fallback to neutral mood if database is unavailable
        print(f"Database error: {str(e)}, returning fallback prompt")
        return {
            "mood_category": "neutral",
            "mood_score": 65,
            "prompt_name": "Balanced Check-in (Fallback)",
            "system_prompt": """You are a compassionate voice AI assistant providing emotional support and wellness guidance. 
                Keep responses conversational, warm, and supportive.
                Focus on: active listening, validation, gentle encouragement, and practical wellness tips.
                If the user seems distressed, suggest professional support resources.""",
            "suggested_duration": "5-10 minutes",
            "follow_up_recommended": True,
            "calculated_at": datetime.now().isoformat()
        }


@router.get("/prompt-preview/{mood_score}")
async def preview_prompt_by_score(
    mood_score: float
):
    """
    Preview what prompt would be used for a given mood score.
    Useful for testing and understanding the system.
    
    - **mood_score**: Mood score between 0-100
    """
    
    if not 0 <= mood_score <= 100:
        raise HTTPException(status_code=400, detail="Mood score must be between 0 and 100")
    
    mood_category = VoicePromptSelector.calculate_mood_category(mood_score)
    prompt_data = VoicePromptSelector.PROMPTS[mood_category].copy()
    
    return {
        "mood_score": mood_score,
        "mood_category": mood_category,
        "prompt_name": prompt_data["name"],
        "system_prompt": prompt_data["system_prompt"],
        "suggested_duration": prompt_data["suggested_duration"],
        "follow_up_recommended": prompt_data["follow_up_recommended"]
    }


@router.get("/mood-categories")
async def get_mood_categories():
    """
    Get all available mood categories and their thresholds.
    Useful for understanding the prompt selection logic.
    """
    
    return {
        "categories": [
            {
                "name": "severe_low",
                "range": "0-20",
                "prompt_type": VoicePromptSelector.PROMPTS["severe_low"]["name"],
                "description": "Critical emotional support needed"
            },
            {
                "name": "low",
                "range": "20-40",
                "prompt_type": VoicePromptSelector.PROMPTS["low"]["name"],
                "description": "Strong emotional support and validation"
            },
            {
                "name": "moderate_low",
                "range": "40-60",
                "prompt_type": VoicePromptSelector.PROMPTS["moderate_low"]["name"],
                "description": "Gentle encouragement and coping strategies"
            },
            {
                "name": "neutral",
                "range": "60-70",
                "prompt_type": VoicePromptSelector.PROMPTS["neutral"]["name"],
                "description": "Balanced check-in and maintenance"
            },
            {
                "name": "moderate_high",
                "range": "70-85",
                "prompt_type": VoicePromptSelector.PROMPTS["moderate_high"]["name"],
                "description": "Positive reinforcement and planning"
            },
            {
                "name": "high",
                "range": "85-100",
                "prompt_type": VoicePromptSelector.PROMPTS["high"]["name"],
                "description": "Celebration and long-term success planning"
            }
        ],
        "thresholds": VoicePromptSelector.MOOD_THRESHOLDS
    }

@router.post("/mood/analyze")
async def analyze_voice_mood(
    user_id: UUID,
    audio: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a completed voice conversation and store mood.

    Flow:
    audio → STT → LLM mood inference → MoodLog
    """

    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Audio file required.",
        )

    temp_path = _save_temp_audio(audio)

    try:
        llm_client = LLMClient()
        mood_service = MoodInferenceService(llm_client)

        mood_log = await mood_service.process_conversation_audio(
            db=db,
            user_id=user_id,
            audio_path=temp_path,
        )

        if not mood_log:
            raise HTTPException(
                status_code=400,
                detail="Unable to infer mood from audio.",
            )

        return {
            "mood_score": mood_log.mood_score,
            "stress": mood_log.stress,
            "anxiety": mood_log.anxiety,
            "sadness": mood_log.sadness,
            "energy": mood_log.energy,
            "logged_at": mood_log.logged_at,
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# ============================================================================
# FRONTEND INTEGRATION EXAMPLE (React Native)
# ============================================================================




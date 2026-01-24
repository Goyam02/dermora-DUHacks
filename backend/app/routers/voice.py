
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.services.voice_prompt_selector import VoicePromptSelector

router = APIRouter(prefix="/voice", tags=["Voice Agent"])
prompt_selector = VoicePromptSelector()


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
    
    prompt_data = await prompt_selector.get_prompt_for_user(db, user_id)
    
    return prompt_data


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


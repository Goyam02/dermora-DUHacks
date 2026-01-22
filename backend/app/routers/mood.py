import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.entities.mood_log import MoodLog
from app.schemas.mood import MoodLogCreate

router = APIRouter(prefix="/mood", tags=["Mood"])


@router.get("/questions")
async def get_mood_questions():
    """
    Returns mood questions.
    Frontend handles emoji UI + numeric mapping.
    """
    return {
        "version": "v1",
        "questions": [
            {
                "id": "mood",
                "prompt": "How are you feeling right now?"
            },
            {
                "id": "stress",
                "prompt": "How stressed do you feel?"
            },
            {
                "id": "anxiety",
                "prompt": "How anxious are you feeling?"
            },
            {
                "id": "energy",
                "prompt": "How is your energy level?"
            }
        ]
    }


@router.post("/log")
async def log_mood(
    payload: MoodLogCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Stores numeric mood values.
    Emoji → number conversion is handled by frontend.
    """

    TEMP_USER_ID = uuid.UUID("b6c7b2b1-87e2-4e0d-9c63-3b8a47a0c7fa")

    mood_log = MoodLog(
        user_id=TEMP_USER_ID,  # TODO: replace with JWT user_id
        mood_score=payload.mood_score,
        stress=payload.stress,
        anxiety=payload.anxiety,
        energy=payload.energy,
        logged_at=payload.logged_at,
    )

    db.add(mood_log)
    await db.commit()

    return {"status": "ok"}

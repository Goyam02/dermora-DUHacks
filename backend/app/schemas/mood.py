# app/schemas/mood.py
from pydantic import BaseModel
from datetime import datetime

class MoodLogCreate(BaseModel):
    mood_score: float
    stress: float
    anxiety: float
    sadness: float
    energy: float
    logged_at: datetime

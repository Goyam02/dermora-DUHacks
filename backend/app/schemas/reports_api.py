from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID
from typing import List

from app.schemas.reports import KeyInsight, Recommendation, WeeklyMetrics


class WeeklyReportAPIResponse(BaseModel):
    """Lean weekly report response for API JSON"""
    report_id: UUID
    user_id: UUID
    week_start: date
    week_end: date

    condition_summary: str
    skin_trend: str

    metrics: WeeklyMetrics
    key_insights: List[KeyInsight]
    recommendations: List[Recommendation]

    generated_at: datetime

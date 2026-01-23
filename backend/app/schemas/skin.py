from pydantic import BaseModel, Field
from datetime import datetime, date
from uuid import UUID
from typing import Optional, List  

# Request schemas
class SkinImageUploadResponse(BaseModel):
    image_id: UUID
    image_url: str
    prediction: str
    confidence: float
    captured_at: datetime
    message: str = "Image uploaded and analyzed successfully"

# Response schemas
class SkinImageDetail(BaseModel):
    id: UUID
    image_url: str
    image_type: str
    captured_at: datetime
    prediction: str
    confidence: float
    
    class Config:
        from_attributes = True

class SkinProgressSummary(BaseModel):
    total_images: int
    date_range: dict
    latest_condition: str
    average_confidence: float
    improvement_detected: Optional[bool]
    images: list[SkinImageDetail]

class SkinAnalysisResult(BaseModel):
    condition: str
    severity: str
    severity_score: int
    affected_area_percentage: float
    redness_level: float
    texture_roughness: float
    description: str

class SkinComparisonResult(BaseModel):
    improvement_detected: bool
    improvement_percentage: float
    severity_change: str
    before_severity_score: int
    after_severity_score: int
    affected_area_change: str
    redness_change: str
    texture_change: str
    detailed_analysis: str
    recommendations: List[str]  # ← Now List is imported
    before_image_id: str
    after_image_id: str
    comparison_date: str


class WeeklyProgress(BaseModel):
    """Single week's progress data"""
    week_start: date
    week_end: date
    primary_condition: str
    average_severity: Optional[float]
    average_confidence: float
    improvement_percentage: Optional[float]
    severity_trend: str
    total_images: int
    initial_image_url: Optional[str]
    latest_image_url: Optional[str]

class MedicalAdvice(BaseModel):
    """Medical recommendations based on progress"""
    advice_text: str
    needs_doctor_visit: bool
    urgency_level: str  # 'low', 'medium', 'high'
    reasoning: str

class ImprovementTrackerResponse(BaseModel):
    """Complete improvement tracker response"""
    user_id: str
    tracking_period: dict  # {start_date, end_date, total_weeks}
    
    # Overall metrics
    overall_improvement: Optional[float]
    current_condition: str
    current_severity: Optional[float]
    trend: str  # 'improving', 'stable', 'worsening'
    
    # Weekly breakdown
    weekly_progress: List[WeeklyProgress]
    
    # Medical insights
    medical_advice: MedicalAdvice
    
    # Key milestones
    best_week: Optional[dict]
    worst_week: Optional[dict]
    
    class Config:
        from_attributes = True

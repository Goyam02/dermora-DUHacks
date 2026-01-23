from pydantic import BaseModel, Field
from datetime import datetime
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

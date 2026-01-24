from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import List, Dict, Optional
from uuid import UUID

class KeyInsight(BaseModel):
    """Single key insight from the week"""
    title: str
    description: str
    severity: str  # 'positive', 'neutral', 'negative'
    icon: str  # emoji or icon name

class Recommendation(BaseModel):
    """Action recommendation"""
    category: str  # 'treatment', 'lifestyle', 'monitoring'
    action: str
    priority: str  # 'high', 'medium', 'low'
    reasoning: str

class WeeklyMetrics(BaseModel):
    """Quantified weekly metrics"""
    average_severity: Optional[float]
    average_confidence: float
    improvement_vs_last_week: Optional[float]
    total_images_uploaded: int
    consistent_tracking: bool
    days_tracked: int

class WeeklyReportResponse(BaseModel):
    """Complete weekly report response"""
    report_id: UUID
    user_id: UUID
    week_start: date
    week_end: date
    
    # Report content
    report_title: str
    condition_summary: str
    report_html: str  # Rich HTML for in-app display
    report_pdf_url: Optional[str]  # URL to download PDF
    
    # Structured data
    key_insights: List[KeyInsight]
    recommendations: List[Recommendation]
    metrics: WeeklyMetrics
    
    # Metadata
    generated_at: datetime
    generated_by: str
    
    class Config:
        from_attributes = True

class ReportGenerationRequest(BaseModel):
    """Request to generate a report"""
    week_start: Optional[date] = None
    include_images: bool = True
    format: str = Field(default="both", pattern="^(html|pdf|both)$")


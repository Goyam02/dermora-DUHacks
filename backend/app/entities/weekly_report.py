from sqlalchemy import Column, String, ForeignKey, Date, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.entities.base import Base

class WeeklyReport(Base):
    __tablename__ = "weekly_reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Week period
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    
    # Trends
    skin_trend = Column(Text)
    mood_trend = Column(Text)
    
    # Report content
    report_text = Column(Text, nullable=False)  # Plain text summary
    report_html = Column(Text)  # Rich HTML for in-app display
    report_pdf_url = Column(Text)  # URL to PDF file
    
    # Structured data
    condition_summary = Column(Text)  # AI-generated summary
    key_insights = Column(JSONB)  # Array of insights
    recommendations = Column(JSONB)  # Array of recommendations
    metrics = Column(JSONB)  # Week metrics as JSON
    
    # Metadata
    generated_by = Column(String, default="azure-gpt-4o")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
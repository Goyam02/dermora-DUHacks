
from sqlalchemy import Column, String, ForeignKey, Float, Integer, Boolean, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.entities.base import Base

class ImprovementRecord(Base):
    __tablename__ = "improvement_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    week_start_date = Column(Date, nullable=False)
    week_end_date = Column(Date, nullable=False)
    
    # Condition tracking
    primary_condition = Column(String, nullable=False)
    average_severity_score = Column(Float)
    average_confidence = Column(Float)
    
    # Improvement metrics
    improvement_percentage = Column(Float)
    severity_trend = Column(String)  # 'improving', 'stable', 'worsening'
    
    # Image tracking
    initial_image_id = Column(UUID(as_uuid=True), ForeignKey("skin_images.id"))
    latest_image_id = Column(UUID(as_uuid=True), ForeignKey("skin_images.id"))
    total_images_this_week = Column(Integer, default=0)
    
    # Medical insights
    medical_advice = Column(String)
    needs_doctor_visit = Column(Boolean, default=False)
    urgency_level = Column(String)  # 'low', 'medium', 'high'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


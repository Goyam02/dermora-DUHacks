from sqlalchemy import Column, String, ForeignKey, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.entities.base import Base

class SkinDiagnosis(Base):
    __tablename__ = "skin_diagnoses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    skin_image_id = Column(UUID(as_uuid=True), ForeignKey("skin_images.id"), nullable=False)
    prediction = Column(String, nullable=False)  # eczema, psoriasis, vitiligo
    confidence = Column(Float, nullable=False)
    model_version = Column(String, default="v1")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

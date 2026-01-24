from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.entities.base import Base

class SkinImage(Base):
    __tablename__ = "skin_images"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    image_url = Column(String, nullable=False)  # Local path or S3 URL
    image_type = Column(String, nullable=False)  # 'before', 'progress', 'after'
    captured_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


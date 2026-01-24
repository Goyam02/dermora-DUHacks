import uuid
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.entities.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 🔑 REQUIRED FOR CLERK
    clerk_user_id = Column(Text, unique=True, index=True, nullable=True)

    email = Column(Text, unique=True, nullable=True)
    full_name = Column(Text, nullable=True)
    phone_number = Column(Text, unique=True, nullable=True)

    profile_picture = Column(Text, nullable=True)

    age = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    primary_skin_issue = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

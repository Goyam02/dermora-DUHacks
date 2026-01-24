from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    age: Optional[str] = None
    gender: Optional[str] = None
    primary_skin_issue: Optional[str] = None


class UserCreate(UserBase):
    clerk_user_id: str   # REQUIRED, not optional
    email: EmailStr      # email should NOT be optional on creation


class UserGenericResponse(UserBase):
    id: UUID
    clerk_user_id: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

from sqlalchemy import select
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependecies import get_current_user
from app.entities.user import User
from app.core.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/sync-user")
async def sync_user(
    clerk_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    clerk_id = clerk_user["sub"]
    email = clerk_user.get("email")  # may be None

    result = await db.execute(
        select(User).where(User.clerk_user_id == clerk_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            clerk_user_id=clerk_id,
            email=email,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {
        "uuid": str(user.id),
        "clerk_user_id": clerk_id,
        "email": user.email,
    }

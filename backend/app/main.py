from fastapi import FastAPI
from app.routers import auth, skin, mood, voice, analytics, reports

app = FastAPI(
    title="Dermora Backend",
    version="0.1.0"
)

# Router registration
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(skin.router, prefix="/skin", tags=["Skin AI"])
app.include_router(mood.router, prefix="/mood", tags=["Mood"])
app.include_router(voice.router, prefix="/voice", tags=["Voice Agent"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}

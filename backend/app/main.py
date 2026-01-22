from fastapi import FastAPI
from app.routers import auth, skin, mood, voice, analytics, reports

app = FastAPI(
    title="Dermora Backend",
    version="0.1.0"
)

app.include_router(auth.router)
app.include_router(skin.router)
app.include_router(mood.router)
app.include_router(voice.router)
app.include_router(analytics.router)
app.include_router(reports.router)


@app.get("/")
async def home():
    return {"status: ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}


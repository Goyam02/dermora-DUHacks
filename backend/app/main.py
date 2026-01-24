from fastapi import FastAPI
from app.routers import skin, mood, voice, analytics, reports
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Dermora Backend",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",  # Alternative dev port
        "http://localhost:5173",  # Vite default
        "http://localhost:8000",  # Backend itself (for testing)
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



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


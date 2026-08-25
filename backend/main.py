from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routers import auth, chat

# Create all database tables automatically on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="College Info AI",
    description="An AI-powered college information assistant",
    version="1.0.0"
)

# Allow the React frontend (running on port 3000) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://college-info-ai.vercel.app",
        "https://college-info-ai-xr5f.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])


@app.get("/")
def root():
    return {"message": "College Info AI Backend is running!"}

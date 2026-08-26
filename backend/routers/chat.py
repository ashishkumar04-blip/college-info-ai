from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from fastapi import Header
import os
from dotenv import load_dotenv

from database import get_db
import models
from ai_service import get_ai_answer
from data_retrieval import retrieve_context

load_dotenv()

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = "HS256"


from typing import Optional

class ChatRequest(BaseModel):
    question: str
    image_data: Optional[str] = None


def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)):
    """Extract and verify the user from the Authorization header."""
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/ask")
def ask_question(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not request.question.strip() and not request.image_data:
        raise HTTPException(status_code=400, detail="Question or image cannot be empty")

    query_text = request.question.strip() if request.question.strip() else "Please analyze this uploaded image/document for LPU students."

    # Step 1: Find relevant info from your data
    context = retrieve_context(query_text)

    # Step 2: Get AI answer using that context + image
    answer = get_ai_answer(query_text, context, request.image_data)

    # Step 3: Save to database
    chat_entry = models.ChatHistory(
        user_id=current_user.id,
        question=query_text,
        answer=answer
    )
    db.add(chat_entry)
    db.commit()

    return {
        "question": query_text,
        "answer": answer
    }


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return the last 20 messages for the logged-in user."""
    history = (
        db.query(models.ChatHistory)
        .filter(models.ChatHistory.user_id == current_user.id)
        .order_by(models.ChatHistory.created_at.asc())
        .limit(20)
        .all()
    )
    return [
        {"question": h.question, "answer": h.answer, "time": str(h.created_at)}
        for h in history
    ]

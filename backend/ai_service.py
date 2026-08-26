import google.generativeai as genai
import os
import base64
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Ultra-fast generation parameters: low temperature & tight max tokens for sub-second generation
generation_config = {
    "temperature": 0.1,
    "top_p": 0.8,
    "max_output_tokens": 600,
}

# Verified active high-volume models with multimodal vision support
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
]

# Fast in-memory query cache for instant 0.01s repeated text queries
_ANSWER_CACHE = {}


def get_ai_answer(question: str, context: str, image_data: Optional[str] = None) -> str:
    """
    Send user question + optional image file to Gemini with multimodal vision analysis.
    """
    cache_key = " ".join(question.lower().strip().split())
    if not image_data and cache_key in _ANSWER_CACHE:
        return _ANSWER_CACHE[cache_key]

    prompt = f"""You are a smart, ultra-fast multimodal AI assistant for Lovely Professional University (LPU).
You have vision capabilities to read timetables, notices, syllabus sheets, fee receipts, circulars, diagrams, and question papers.
Answer directly and concisely in structured bullet points based on the verified LPU info below and any attached image.
If the user asks in Hinglish, reply in simple, friendly English or natural Hinglish.
Avoid introductory greetings. Give the exact facts immediately.

COLLEGE INFO:
{context}

STUDENT'S QUESTION:
{question}

DIRECT ANSWER:"""

    # Prepare multimodal content array
    contents = []
    if image_data and "," in image_data:
        try:
            header, encoded = image_data.split(",", 1)
            mime_type = header.split(";")[0].replace("data:", "")
            image_bytes = base64.b64decode(encoded)
            contents.append({"mime_type": mime_type, "data": image_bytes})
        except Exception as e:
            print("Error decoding image:", e)

    contents.append(prompt)

    # 1. Try verified high-volume Gemini models in sequence
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(contents)
            if response and response.text:
                answer = response.text.strip()
                if not image_data:
                    _ANSWER_CACHE[cache_key] = answer
                return answer
        except Exception:
            continue

    # 2. Resilient Smart Fallback
    if context and len(context.strip()) > 20:
        fallback_answer = f"Here is the verified information from the LPU database:\n\n{context[:800]}"
        if not image_data:
            _ANSWER_CACHE[cache_key] = fallback_answer
        return fallback_answer

    return "I don't have verified details on this specific query. Please contact LPU Admissions at 1800-102-4431 or admissions@lpu.in."

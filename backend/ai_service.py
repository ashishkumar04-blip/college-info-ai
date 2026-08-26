import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Ultra-fast generation parameters: low temperature & tight max tokens for sub-second generation
generation_config = {
    "temperature": 0.1,
    "top_p": 0.8,
    "max_output_tokens": 500,
}

# Verified active high-volume models in exact priority order
FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-flash-latest",
]

# Fast in-memory query cache for instant 0.01s repeated/popular answers
_ANSWER_CACHE = {}


def get_ai_answer(question: str, context: str) -> str:
    """
    Send user question to Gemini with in-memory caching and multi-model fallback.
    """
    cache_key = " ".join(question.lower().strip().split())
    if cache_key in _ANSWER_CACHE:
        return _ANSWER_CACHE[cache_key]

    prompt = f"""You are a smart, ultra-fast AI assistant for Lovely Professional University (LPU).
Answer directly and concisely in short bullet points based on the verified LPU info below.
If user asks in Hinglish, reply in friendly simple English or natural Hinglish.
Avoid introductory greetings. Give the exact facts immediately.

COLLEGE INFO:
{context}

QUESTION:
{question}

ANSWER:"""

    # 1. Try verified high-volume Gemini models in sequence
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt)
            if response and response.text:
                answer = response.text.strip()
                _ANSWER_CACHE[cache_key] = answer
                return answer
        except Exception:
            continue

    # 2. Resilient Smart Fallback: Return verified direct context
    if context and len(context.strip()) > 20:
        fallback_answer = f"Here is the verified information from the LPU database:\n\n{context[:800]}"
        _ANSWER_CACHE[cache_key] = fallback_answer
        return fallback_answer

    return "I don't have verified details on this specific query. Please contact LPU Admissions at 1800-102-4431 or admissions@lpu.in."

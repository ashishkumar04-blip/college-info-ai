import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Ultra-fast generation parameters
generation_config = {
    "temperature": 0.2,
    "top_p": 0.85,
    "max_output_tokens": 850,
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


def get_ai_answer(question: str, context: str) -> str:
    """
    Send user question to Gemini with multi-model fallback.
    If all external API models are rate-limited, safely returns the verified LPU context.
    """
    prompt = f"""You are a smart, friendly, and ultra-fast AI student companion for Lovely Professional University (LPU).
You understand student queries in English, Hindi, and Hinglish (e.g., "hostel me cooler allowed hai?", "75% attendance rule kya hai?").

Guidelines:
1. Answer directly and concisely based on the verified LPU information provided below.
2. Structure answers with clean bullet points, bold key points, and clear numbers.
3. If the user asks in casual Hinglish/Hindi, reply in simple, friendly English or natural Hinglish as appropriate.
4. Do not include boring corporate preambles. Get straight to the answer.
5. If the exact answer is not present in the provided info, say: "I don't have verified details on this specific query. Please check with LPU Admissions at 1800-102-4431 or Division of Student Welfare (DSW)."

COLLEGE INFORMATION:
{context}

STUDENT'S QUESTION:
{question}

DIRECT ANSWER:"""

    # 1. Try verified high-volume Gemini models in sequence
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception:
            # Silently fallback to next model in list
            continue

    # 2. Resilient Smart Fallback: If all API endpoints hit quota limits, return direct verified context
    if context and len(context.strip()) > 20:
        return f"Here is the verified information from the LPU database regarding your query:\n\n{context[:900]}"

    return "I don't have verified details on this specific query. Please contact LPU Admissions at 1800-102-4431 or admissions@lpu.in."

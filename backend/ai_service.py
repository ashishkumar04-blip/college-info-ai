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

# High-volume models with automatic fallback if one hits a rate limit
FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro",
    "gemini-3.6-flash",
]


def get_ai_answer(question: str, context: str) -> str:
    """
    Send user question to Gemini with automatic multi-model fallback
    to prevent 429 rate limit errors.
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

    last_error = ""

    # Try each model in sequence if a 429 quota or transient error occurs
    for model_name in FALLBACK_MODELS:
        try:
            model = genai.GenerativeModel(model_name, generation_config=generation_config)
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text
        except Exception as e:
            last_error = str(e)
            # If rate limit or model unavailable, try next model in fallback list
            continue

    return f"Sorry, the AI service is currently busy. Please try again in a few moments. (Error: {last_error})"

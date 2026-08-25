import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Ultra-fast Gemini Flash configuration
generation_config = {
    "temperature": 0.2,
    "top_p": 0.85,
    "max_output_tokens": 850,
}

model = genai.GenerativeModel("gemini-3.6-flash", generation_config=generation_config)


def get_ai_answer(question: str, context: str) -> str:
    """
    Send user question to Gemini with bilingual English/Hinglish student conversational understanding.
    """
    prompt = f"""You are a smart, friendly, and ultra-fast AI student companion for Lovely Professional University (LPU).
You understand student queries in English, Hindi, and Hinglish (e.g., "hostel me cooler allowed hai?", "75% attendance rule kya hai?").

Guidelines:
1. Answer directly and concisely based on the verified LPU information provided below.
2. Structure answers with clean bullet points, bold key points, and clear numbers.
3. If the user asks in casual Hinglish/Hindi, reply in simple, friendly English or natural Hinglish as appropriate so it is clear and helpful.
4. Do not include boring corporate preambles. Get straight to the answer.
5. If the exact answer is not present in the provided info, say: "I don't have verified details on this specific query. Please check with LPU Admissions at 1800-102-4431 or Division of Student Welfare (DSW)."

COLLEGE INFORMATION:
{context}

STUDENT'S QUESTION:
{question}

DIRECT ANSWER:"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Sorry, I couldn't generate an answer right now. Please try again. (Error: {str(e)})"

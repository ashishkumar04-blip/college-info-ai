import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use the ultra-fast Gemini Flash model with optimized generation parameters
generation_config = {
    "temperature": 0.2,       # Low temperature for fast, factual, and direct token generation
    "top_p": 0.85,
    "max_output_tokens": 800, # Keep responses concise and focused to reduce generation time
}

model = genai.GenerativeModel("gemini-3.6-flash", generation_config=generation_config)


def get_ai_answer(question: str, context: str) -> str:
    """
    Send the user's question + relevant college data to Gemini
    and get a crisp, fast, and structured answer back.
    """
    prompt = f"""You are an ultra-fast, helpful AI assistant for Lovely Professional University (LPU).
Answer the student's question directly, accurately, and concisely based ONLY on the provided college information.
Use short bullet points, bold highlights, and clear formatting. Avoid long preambles or repetitive disclaimers.
If the information is not present, briefly state: "I don't have specific details on that. Please contact LPU Admissions at 1800-102-4431 or admissions@lpu.in."

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

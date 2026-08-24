import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini with your API key
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use the free Gemini Flash model
model = genai.GenerativeModel("gemini-3.6-flash")


def get_ai_answer(question: str, context: str) -> str:
    """
    Send the user's question + relevant college data to Gemini
    and get a clear, simple answer back.
    """
    prompt = f"""You are a helpful college information assistant. 
Answer the student's question ONLY based on the provided college information below.
Explain in simple, clear language that a student can easily understand.
If the answer is not found in the provided information, say: 
"I don't have specific information about that. Please contact the college office at info@college.edu"

COLLEGE INFORMATION:
{context}

STUDENT'S QUESTION:
{question}

ANSWER:"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Sorry, I couldn't generate an answer right now. Please try again. (Error: {str(e)})"

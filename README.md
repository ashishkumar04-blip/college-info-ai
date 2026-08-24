# 🎓 LPU College Info AI

An AI-powered information assistant for Lovely Professional University (LPU). Students can create an account, log in, and ask questions about admissions, courses, fees, hostels, placements, and more — and get clear, accurate answers instantly.

## 🚀 Features

- ✅ User registration and login (JWT authentication)
- ✅ AI-powered Q&A chat interface
- ✅ Answers based on real LPU data
- ✅ Chat history saved per user
- ✅ Secure password hashing (bcrypt)
- ✅ Protected routes (only logged-in users can chat)

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Python, FastAPI, Uvicorn |
| Database | SQLite (SQLAlchemy ORM) |
| AI | Google Gemini API |
| Auth | JWT Tokens + bcrypt |

## 📁 Project Structure

```
college-info-ai/
├── frontend/          # React app
│   └── src/
│       ├── pages/     # LoginPage, SignupPage, ChatPage
│       ├── context/   # AuthContext (login state)
│       └── services/  # api.js (Axios calls)
├── backend/           # FastAPI server
│   ├── routers/       # auth.py, chat.py
│   ├── main.py        # App entry point
│   ├── models.py      # Database tables
│   ├── ai_service.py  # Gemini AI integration
│   └── data_retrieval.py  # Data search logic
└── data/
    └── college_info.txt   # LPU knowledge base
```

## ⚙️ How to Run Locally

### Backend

```bash
cd backend
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at: http://localhost:3000

## 🔐 Environment Variables

Create a `.env` file inside the `backend/` folder:

```
DATABASE_URL=sqlite:///./college_info.db
SECRET_KEY=your-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

> ⚠️ Never commit the `.env` file to GitHub.

## 👨‍💻 Built By

College project by [Your Name] — demonstrating full-stack web development with AI integration.

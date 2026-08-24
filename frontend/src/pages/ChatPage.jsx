import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

export default function ChatPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Load chat history when page opens
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await API.get("/chat/history");
        const history = response.data.flatMap((item) => [
          { sender: "user", text: item.question },
          { sender: "ai", text: item.answer },
        ]);
        setMessages(history);
      } catch (err) {
        console.error("Could not load history", err);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleSend = async () => {
    if (!question.trim() || loading) return;

    const userMessage = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await API.post("/chat/ask", { question });
      const aiMessage = { sender: "ai", text: response.data.answer };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Allow sending with Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🎓 College Info AI</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>👤 {user?.name}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>💬</p>
            <p style={styles.emptyText}>Hi {user?.name}! Ask me anything about college.</p>
            <div style={styles.suggestions}>
              {[
                "What are the admission requirements?",
                "What courses are offered?",
                "How much is the hostel fee?",
                "When are the exams?",
              ].map((s) => (
                <button
                  key={s}
                  style={styles.suggestionBtn}
                  onClick={() => setQuestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.messageRow,
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.sender === "ai" && <span style={styles.avatar}>🤖</span>}
            <div
              style={{
                ...styles.bubble,
                backgroundColor: msg.sender === "user" ? "#1a73e8" : "white",
                color: msg.sender === "user" ? "white" : "#333",
              }}
            >
              {msg.text}
            </div>
            {msg.sender === "user" && <span style={styles.avatar}>👤</span>}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <span style={styles.avatar}>🤖</span>
            <div style={{ ...styles.bubble, backgroundColor: "white", color: "#888" }}>
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <input
          style={styles.input}
          type="text"
          placeholder="Ask a question about college..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !question.trim() ? 0.6 : 1,
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={loading || !question.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#f0f4f8",
  },
  header: {
    backgroundColor: "#1a73e8",
    color: "white",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  headerTitle: { margin: 0, fontSize: "20px" },
  headerRight: { display: "flex", alignItems: "center", gap: "16px" },
  userName: { fontSize: "14px" },
  logoutBtn: {
    backgroundColor: "white",
    color: "#1a73e8",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
  },
  emptyState: {
    textAlign: "center",
    marginTop: "60px",
    color: "#555",
  },
  emptyIcon: { fontSize: "48px" },
  emptyText: { fontSize: "18px", marginBottom: "20px" },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
    maxWidth: "500px",
    margin: "0 auto",
  },
  suggestionBtn: {
    padding: "8px 14px",
    backgroundColor: "white",
    border: "1px solid #1a73e8",
    borderRadius: "20px",
    color: "#1a73e8",
    cursor: "pointer",
    fontSize: "13px",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    marginBottom: "12px",
  },
  avatar: { fontSize: "20px" },
  bubble: {
    maxWidth: "65%",
    padding: "12px 16px",
    borderRadius: "18px",
    fontSize: "15px",
    lineHeight: "1.5",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    whiteSpace: "pre-wrap",
  },
  inputArea: {
    padding: "16px 24px",
    backgroundColor: "white",
    display: "flex",
    gap: "12px",
    borderTop: "1px solid #ddd",
    boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "24px",
    border: "1px solid #ddd",
    fontSize: "15px",
    outline: "none",
  },
  sendBtn: {
    padding: "12px 24px",
    backgroundColor: "#1a73e8",
    color: "white",
    border: "none",
    borderRadius: "24px",
    fontSize: "15px",
    fontWeight: "bold",
  },
};

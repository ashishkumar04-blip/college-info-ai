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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const bottomRef = useRef(null);

  // Load chat history on open
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await API.get("/chat/history");
        const history = response.data.flatMap((item) => [
          { sender: "user", text: item.question, time: formatTime(item.time) },
          { sender: "ai", text: item.answer, time: formatTime(item.time) },
        ]);
        setMessages(history);
      } catch (err) {
        console.error("Could not load history", err);
      }
    };
    loadHistory();
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const formatTime = (timeStr) => {
    try {
      return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleSend = async () => {
    if (!question.trim() || loading) return;
    const time = now();
    const userMessage = { sender: "user", text: question, time };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await API.post("/chat/ask", { question });
      setMessages((prev) => [...prev, { sender: "ai", text: response.data.answer, time }]);
    } catch (err) {
      console.error("Chat error:", err);
      const detail = err.response?.data?.detail;
      const errorText = detail
        ? `Error: ${detail}`
        : "Sorry, I couldn't reach the server. Please check your connection and try again.";
      setMessages((prev) => [...prev, { sender: "ai", text: errorText, time }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const suggestions = [
    "🎓 How do I get admission at LPU?",
    "💰 What are the hostel fees?",
    "📚 What B.Tech courses are offered?",
    "🏆 What is LPU's ranking?",
    "💼 Which companies recruit from LPU?",
    "📱 How do I use the UMS portal?",
  ];

  return (
    <div style={styles.container}>
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-7px); }
        }
        .msg-enter { animation: fadeSlideIn 0.3s ease forwards; }
        .suggestion-btn:hover {
          background-color: #8B0000 !important;
          color: white !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139,0,0,0.3);
        }
        .copy-btn:hover { background-color: #f5f5f5 !important; }
        input:focus { border-color: #8B0000 !important; box-shadow: 0 0 0 3px rgba(139,0,0,0.1); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #c0392b; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoCircle}>LPU</div>
          <div>
            <div style={styles.headerTitle}>🎓 College Info AI</div>
            <div style={styles.headerSubtitle}>Lovely Professional University</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userBadge}>
            <span style={styles.onlineDot}>●</span>
            <span style={{ fontSize: "13px" }}>{user?.name}</span>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎓</div>
            <h2 style={styles.emptyTitle}>Hi, {user?.name}!</h2>
            <p style={styles.emptyText}>I know everything about LPU. Ask me anything!</p>
            <div style={styles.suggestions}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="suggestion-btn"
                  style={styles.suggestionBtn}
                  onClick={() => setQuestion(s.substring(3))}
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
            className="msg-enter"
            style={{
              ...styles.messageRow,
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.sender === "ai" && <div style={styles.aiAvatar}>AI</div>}

            <div style={{ display: "flex", flexDirection: "column", maxWidth: "65%" }}>
              <div style={{ ...styles.bubble, ...(msg.sender === "user" ? styles.userBubble : styles.aiBubble) }}>
                {msg.text}
                {msg.sender === "ai" && (
                  <button
                    className="copy-btn"
                    style={styles.copyBtn}
                    onClick={() => handleCopy(msg.text, index)}
                  >
                    {copiedIndex === index ? "✅ Copied!" : "📋 Copy"}
                  </button>
                )}
              </div>
              <div style={{ ...styles.timestamp, textAlign: msg.sender === "user" ? "right" : "left" }}>
                {msg.time}
              </div>
            </div>

            {msg.sender === "user" && (
              <div style={styles.userAvatar}>{user?.name?.[0]?.toUpperCase()}</div>
            )}
          </div>
        ))}

        {/* Typing Animation */}
        {loading && (
          <div className="msg-enter" style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.aiAvatar}>AI</div>
            <div style={{ ...styles.bubble, ...styles.aiBubble, padding: "14px 20px" }}>
              <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span key={i} style={{ ...styles.dot, animationDelay: `${delay}s` }} />
                ))}
              </div>
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
          placeholder="Ask anything about LPU..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: loading || !question.trim() ? 0.5 : 1,
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={loading || !question.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#fdf6f6", fontFamily: "'Segoe UI', Tahoma, sans-serif" },
  header: {
    background: "linear-gradient(135deg, #6d0000 0%, #c0392b 100%)",
    color: "white",
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(139,0,0,0.4)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoCircle: {
    width: "44px", height: "44px", borderRadius: "50%",
    backgroundColor: "white", color: "#8B0000",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "900", fontSize: "13px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  headerTitle: { fontSize: "18px", fontWeight: "bold" },
  headerSubtitle: { fontSize: "11px", opacity: 0.8, marginTop: "2px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  userBadge: {
    display: "flex", alignItems: "center", gap: "6px",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "5px 12px", borderRadius: "20px",
  },
  onlineDot: { color: "#2ecc71", fontSize: "10px" },
  logoutBtn: {
    backgroundColor: "white", color: "#8B0000", border: "none",
    padding: "7px 16px", borderRadius: "20px", cursor: "pointer",
    fontWeight: "bold", fontSize: "13px",
  },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "4px" },
  emptyState: { textAlign: "center", margin: "auto", padding: "20px 0 40px 0" },
  emptyIcon: { fontSize: "60px", marginBottom: "12px" },
  emptyTitle: { color: "#8B0000", margin: "0 0 8px 0", fontSize: "24px" },
  emptyText: { color: "#888", marginBottom: "28px", fontSize: "15px" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", maxWidth: "540px", margin: "0 auto" },
  suggestionBtn: {
    padding: "9px 16px", backgroundColor: "white",
    border: "1.5px solid #c0392b", borderRadius: "20px",
    color: "#8B0000", cursor: "pointer", fontSize: "13px",
    fontWeight: "500", transition: "all 0.2s ease",
  },
  messageRow: { display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "10px" },
  aiAvatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: "linear-gradient(135deg, #6d0000, #c0392b)",
    color: "white", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0,
  },
  userAvatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: "linear-gradient(135deg, #2c3e50, #34495e)",
    color: "white", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "15px", fontWeight: "bold", flexShrink: 0,
  },
  bubble: {
    padding: "12px 16px", borderRadius: "18px", fontSize: "14px",
    lineHeight: "1.6", boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  userBubble: { background: "linear-gradient(135deg, #8B0000, #c0392b)", color: "white", borderBottomRightRadius: "4px" },
  aiBubble: { backgroundColor: "white", color: "#2c3e50", borderBottomLeftRadius: "4px" },
  copyBtn: {
    display: "block", marginTop: "8px", background: "none",
    border: "1px solid #eee", borderRadius: "12px", padding: "3px 10px",
    fontSize: "11px", cursor: "pointer", color: "#888", transition: "all 0.2s",
  },
  timestamp: { fontSize: "10px", color: "#bbb", marginTop: "4px", paddingLeft: "4px", paddingRight: "4px" },
  dot: {
    width: "8px", height: "8px", backgroundColor: "#c0392b",
    borderRadius: "50%", display: "inline-block",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  inputArea: {
    padding: "14px 20px", backgroundColor: "white",
    display: "flex", gap: "10px", borderTop: "1px solid #f0e8e8",
    boxShadow: "0 -4px 15px rgba(0,0,0,0.05)",
  },
  input: {
    flex: 1, padding: "12px 18px", borderRadius: "24px",
    border: "1.5px solid #e8d5d5", fontSize: "14px",
    outline: "none", backgroundColor: "#fdf6f6",
    transition: "all 0.2s ease",
  },
  sendBtn: {
    width: "46px", height: "46px",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white", border: "none", borderRadius: "50%",
    fontSize: "18px", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 3px 10px rgba(139,0,0,0.3)",
  },
};

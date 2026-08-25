import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

// Rich Markdown-style text renderer for AI responses
function FormattedText({ text }) {
  if (!text) return null;

  // Split into lines
  const lines = text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} style={{ height: "4px" }} />;
        }

        // Section Headers (## or ###)
        if (trimmed.startsWith("###") || trimmed.startsWith("##")) {
          const headerText = trimmed.replace(/^#+\s*/, "");
          return (
            <div
              key={idx}
              style={{
                fontWeight: "700",
                color: "#8B0000",
                fontSize: "15px",
                marginTop: "6px",
                marginBottom: "2px",
                borderBottom: "1px solid #f0d5d5",
                paddingBottom: "3px",
              }}
            >
              {headerText}
            </div>
          );
        }

        // Bullet Points (*, -, •)
        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "4px" }}>
              <span style={{ color: "#c0392b", fontWeight: "bold", fontSize: "14px" }}>•</span>
              <span style={{ flex: 1, lineHeight: "1.5" }}>{renderInlineFormatting(content)}</span>
            </div>
          );
        }

        // Numbered lists (1., 2.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "4px" }}>
              <span style={{ color: "#8B0000", fontWeight: "700", minWidth: "18px", fontSize: "13px" }}>{numMatch[1]}.</span>
              <span style={{ flex: 1, lineHeight: "1.5" }}>{renderInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={idx} style={{ margin: "0", lineHeight: "1.6" }}>
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

// Parses **bold** and `code` inside lines
function renderInlineFormatting(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ color: "#111", fontWeight: "600" }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: "#f5e6e6",
            color: "#8B0000",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "12px",
            fontFamily: "monospace",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export default function ChatPage() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const bottomRef = useRef(null);
  const speechRecognitionRef = useRef(null);

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

  // Setup Voice Input (Speech Recognition)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuestion((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      speechRecognitionRef.current = recognition;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
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
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    logoutUser();
    navigate("/login");
  };

  // Helper to generate context-aware follow-up suggestion chips
  const generateFollowUps = (q, answer) => {
    const text = (q + " " + answer).toLowerCase();
    const suggestions = [];

    if (text.includes("hostel") || text.includes("room") || text.includes("mess")) {
      suggestions.push("How to apply for a hostel gate pass on UMS?", "What are the mess menu options?", "What are the hostel curfew timings?");
    } else if (text.includes("fee") || text.includes("scholarship") || text.includes("cost")) {
      suggestions.push("What scholarships are available through LPUNEST?", "What is the fee payment deadline on LPU Pay?", "Are there sibling or defence concessions?");
    } else if (text.includes("exam") || text.includes("mtt") || text.includes("ete") || text.includes("attendance")) {
      suggestions.push("What is the 75% attendance rule?", "How do I apply for reappear exams?", "How to download the exam admit card?");
    } else if (text.includes("placement") || text.includes("salary") || text.includes("job") || text.includes("package")) {
      suggestions.push("Which top companies recruit from LPU?", "What is the average package for CSE?", "How does the Center for Professional Enhancement (CPE) help?");
    } else if (text.includes("admission") || text.includes("lpunest") || text.includes("eligibility")) {
      suggestions.push("What documents are required for admission?", "What are the LPUNEST exam phases?", "What courses are offered in B.Tech?");
    } else {
      suggestions.push("Tell me about LPU's NAAC A++ accreditation", "What facilities are in the Central Library?", "How do I use the UMS student portal?");
    }

    setFollowUps(suggestions.slice(0, 3));
  };

  const handleSend = async (customQuestion) => {
    const qToSend = (typeof customQuestion === "string" ? customQuestion : question).trim();
    if (!qToSend || loading) return;

    const time = now();
    const userMessage = { sender: "user", text: qToSend, time };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setLoading(true);
    setFollowUps([]);

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingIndex(null);

    try {
      const response = await API.post("/chat/ask", { question: qToSend });
      const fullAnswer = response.data.answer;

      // Stream / Typewriter effect
      let currentLength = 0;
      const aiMessagePlaceholder = { sender: "ai", text: "", time };
      setMessages((prev) => [...prev, aiMessagePlaceholder]);

      const interval = setInterval(() => {
        currentLength += 8;
        if (currentLength >= fullAnswer.length) {
          clearInterval(interval);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { sender: "ai", text: fullAnswer, time };
            return updated;
          });
          generateFollowUps(qToSend, fullAnswer);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { sender: "ai", text: fullAnswer.substring(0, currentLength), time };
            return updated;
          });
        }
      }, 15);
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

  const handleFeedback = (index, type) => {
    setFeedback((prev) => ({ ...prev, [index]: type }));
  };

  // Text-to-Speech (Voice Reader)
  const handleSpeak = (text, index) => {
    if (!window.speechSynthesis) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text of markdown for natural speech
    const cleanText = text.replace(/[*#`_•]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle Voice Input
  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) {
      alert("Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      speechRecognitionRef.current.start();
      setIsListening(true);
    }
  };

  const initialSuggestions = [
    "🎓 How do I get admission at LPU?",
    "💰 What are the hostel & mess fees?",
    "📚 What B.Tech specializations are offered?",
    "🏆 What are LPU's NAAC & NIRF rankings?",
    "💼 Which companies visit for campus placement?",
    "📱 How does the 75% attendance rule work?",
  ];

  return (
    <div style={styles.container}>
      {/* CSS Animations & Interactivity */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.7); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(192, 57, 43, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); }
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
          box-shadow: 0 4px 12px rgba(139,0,0,0.25);
        }
        .action-icon-btn:hover {
          background-color: #fcebeb !important;
          color: #8B0000 !important;
          transform: scale(1.1);
        }
        .mic-listening {
          animation: pulse 1.5s infinite !important;
          background-color: #c0392b !important;
          color: white !important;
        }
        input:focus {
          border-color: #8B0000 !important;
          box-shadow: 0 0 0 3px rgba(139,0,0,0.12) !important;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #fdf6f6; }
        ::-webkit-scrollbar-thumb { background: #d98880; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #c0392b; }
      `}</style>

      {/* Header Bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoCircle}>LPU</div>
          <div>
            <div style={styles.headerTitle}>🎓 College Info AI</div>
            <div style={styles.headerSubtitle}>Lovely Professional University • AI Assistant</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userBadge}>
            <span style={styles.onlineDot}>●</span>
            <span style={{ fontSize: "13px", fontWeight: "600" }}>{user?.name || "Student"}</span>
          </div>
          <button
            style={styles.newChatBtn}
            onClick={() => {
              setMessages([]);
              setFollowUps([]);
              if (window.speechSynthesis) window.speechSynthesis.cancel();
            }}
            title="Start fresh conversation"
          >
            ➕ New Chat
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Chat Conversation Area */}
      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎓</div>
            <h2 style={styles.emptyTitle}>Welcome, {user?.name || "Student"}!</h2>
            <p style={styles.emptyText}>
              I have official verified knowledge across all <strong>17 LPU categories</strong> (Admissions, Fees, Placements, Hostels, UMS, Exams, and more).
            </p>
            <div style={styles.suggestions}>
              {initialSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  style={styles.suggestionBtn}
                  onClick={() => handleSend(s.substring(3))}
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

            <div style={{ display: "flex", flexDirection: "column", maxWidth: "75%" }}>
              <div
                style={{
                  ...styles.bubble,
                  ...(msg.sender === "user" ? styles.userBubble : styles.aiBubble),
                }}
              >
                {msg.sender === "ai" ? (
                  <FormattedText text={msg.text} />
                ) : (
                  <span>{msg.text}</span>
                )}

                {/* AI Response Action Buttons */}
                {msg.sender === "ai" && msg.text && (
                  <div style={styles.actionToolbar}>
                    <button
                      className="action-icon-btn"
                      style={styles.actionBtn}
                      onClick={() => handleCopy(msg.text, index)}
                      title="Copy response"
                    >
                      {copiedIndex === index ? "✅ Copied" : "📋 Copy"}
                    </button>
                    <button
                      className="action-icon-btn"
                      style={{
                        ...styles.actionBtn,
                        color: speakingIndex === index ? "#c0392b" : "#666",
                        fontWeight: speakingIndex === index ? "700" : "500",
                      }}
                      onClick={() => handleSpeak(msg.text, index)}
                      title={speakingIndex === index ? "Stop voice" : "Listen to answer"}
                    >
                      {speakingIndex === index ? "⏹️ Stop" : "🔊 Listen"}
                    </button>
                    <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                      <button
                        className="action-icon-btn"
                        style={{
                          ...styles.ratingBtn,
                          backgroundColor: feedback[index] === "up" ? "#eafaf1" : "transparent",
                          borderColor: feedback[index] === "up" ? "#2ecc71" : "#eee",
                        }}
                        onClick={() => handleFeedback(index, "up")}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className="action-icon-btn"
                        style={{
                          ...styles.ratingBtn,
                          backgroundColor: feedback[index] === "down" ? "#fdedec" : "transparent",
                          borderColor: feedback[index] === "down" ? "#e74c3c" : "#eee",
                        }}
                        onClick={() => handleFeedback(index, "down")}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...styles.timestamp, textAlign: msg.sender === "user" ? "right" : "left" }}>
                {msg.time}
              </div>
            </div>

            {msg.sender === "user" && (
              <div style={styles.userAvatar}>
                {(user?.name || "U")[0].toUpperCase()}
              </div>
            )}
          </div>
        ))}

        {/* Typing Animation when AI is thinking */}
        {loading && (
          <div className="msg-enter" style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.aiAvatar}>AI</div>
            <div style={{ ...styles.bubble, ...styles.aiBubble, padding: "14px 20px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#888", marginRight: "4px" }}>Thinking</span>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span key={i} style={{ ...styles.dot, animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Contextual Follow-Up Suggestions */}
        {followUps.length > 0 && !loading && (
          <div style={styles.followUpContainer} className="msg-enter">
            <div style={styles.followUpTitle}>💡 Suggested follow-ups:</div>
            <div style={styles.followUpChips}>
              {followUps.map((chip, idx) => (
                <button
                  key={idx}
                  className="suggestion-btn"
                  style={styles.followUpChip}
                  onClick={() => handleSend(chip)}
                >
                  {chip} →
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={styles.inputArea}>
        {/* Voice Microphone Button */}
        <button
          className={isListening ? "mic-listening" : "action-icon-btn"}
          style={{
            ...styles.micBtn,
            backgroundColor: isListening ? "#c0392b" : "#f5e6e6",
            color: isListening ? "white" : "#8B0000",
          }}
          onClick={toggleVoiceInput}
          title={isListening ? "Listening... click to stop" : "Click to speak your question"}
          disabled={loading}
        >
          {isListening ? "🎙️" : "🎤"}
        </button>

        <input
          style={styles.input}
          type="text"
          placeholder={isListening ? "Listening... speak now" : "Ask anything about LPU (Admissions, Fees, Placements, Exams)..."}
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
          onClick={() => handleSend()}
          disabled={loading || !question.trim()}
          title="Send question"
        >
          ➤
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
    backgroundColor: "#fcf8f8",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    background: "linear-gradient(135deg, #6d0000 0%, #a92215 100%)",
    color: "white",
    padding: "12px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(109, 0, 0, 0.3)",
    zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  logoCircle: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    backgroundColor: "white",
    color: "#8B0000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    letterSpacing: "0.5px",
  },
  headerTitle: { fontSize: "18px", fontWeight: "700", letterSpacing: "0.2px" },
  headerSubtitle: { fontSize: "11px", opacity: 0.85, marginTop: "2px" },
  headerRight: { display: "flex", alignItems: "center", gap: "10px" },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(255,255,255,0.18)",
    padding: "5px 12px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.2)",
  },
  onlineDot: { color: "#2ecc71", fontSize: "11px" },
  newChatBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.3)",
    padding: "6px 12px",
    borderRadius: "18px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  logoutBtn: {
    backgroundColor: "white",
    color: "#8B0000",
    border: "none",
    padding: "6px 14px",
    borderRadius: "18px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyState: {
    textAlign: "center",
    margin: "auto",
    padding: "20px 0 40px 0",
    maxWidth: "600px",
  },
  emptyIcon: { fontSize: "56px", marginBottom: "12px" },
  emptyTitle: { color: "#8B0000", margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700" },
  emptyText: { color: "#666", marginBottom: "24px", fontSize: "14px", lineHeight: "1.6" },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "center",
  },
  suggestionBtn: {
    padding: "9px 16px",
    backgroundColor: "white",
    border: "1.5px solid #d98880",
    borderRadius: "20px",
    color: "#8B0000",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    marginBottom: "10px",
  },
  aiAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "bold",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(139,0,0,0.3)",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2c3e50, #4a6572)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold",
    flexShrink: 0,
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  bubble: {
    padding: "14px 18px",
    borderRadius: "18px",
    fontSize: "14px",
    lineHeight: "1.6",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "linear-gradient(135deg, #8B0000 0%, #b02a1e 100%)",
    color: "white",
    borderBottomRightRadius: "4px",
  },
  aiBubble: {
    backgroundColor: "white",
    color: "#2c3e50",
    border: "1px solid #f0e6e6",
    borderBottomLeftRadius: "4px",
  },
  actionToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "12px",
    paddingTop: "8px",
    borderTop: "1px solid #f4e8e8",
  },
  actionBtn: {
    background: "none",
    border: "1px solid #e8d0d0",
    borderRadius: "14px",
    padding: "4px 10px",
    fontSize: "11px",
    cursor: "pointer",
    color: "#666",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  ratingBtn: {
    background: "none",
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "3px 8px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  timestamp: {
    fontSize: "10px",
    color: "#aaa",
    marginTop: "4px",
    paddingLeft: "6px",
    paddingRight: "6px",
  },
  dot: {
    width: "7px",
    height: "7px",
    backgroundColor: "#c0392b",
    borderRadius: "50%",
    display: "inline-block",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  followUpContainer: {
    marginLeft: "46px",
    marginTop: "4px",
    marginBottom: "12px",
  },
  followUpTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#8B0000",
    marginBottom: "6px",
  },
  followUpChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  followUpChip: {
    padding: "6px 12px",
    backgroundColor: "#fff0f0",
    border: "1px solid #f0b0a8",
    borderRadius: "16px",
    color: "#8B0000",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  inputArea: {
    padding: "16px 20px",
    backgroundColor: "white",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderTop: "1px solid #f0e4e4",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.04)",
  },
  micBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "1px solid #e8d0d0",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "12px 18px",
    borderRadius: "24px",
    border: "1.5px solid #e5d0d0",
    fontSize: "14px",
    outline: "none",
    backgroundColor: "#faf5f5",
    transition: "all 0.2s ease",
  },
  sendBtn: {
    width: "44px",
    height: "44px",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 3px 10px rgba(139,0,0,0.3)",
    flexShrink: 0,
    transition: "all 0.2s",
  },
};

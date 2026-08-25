import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

// LPU 10-Point Grade Mapping
const GRADE_POINTS = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
  E: 0,
};

// Rich Markdown Text Renderer
function FormattedText({ text, isDark }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: "4px" }} />;

        if (trimmed.startsWith("###") || trimmed.startsWith("##")) {
          const headerText = trimmed.replace(/^#+\s*/, "");
          return (
            <div
              key={idx}
              style={{
                fontWeight: "700",
                color: isDark ? "#ff6b6b" : "#8B0000",
                fontSize: "15px",
                marginTop: "6px",
                marginBottom: "2px",
                borderBottom: `1px solid ${isDark ? "#442222" : "#f0d5d5"}`,
                paddingBottom: "3px",
              }}
            >
              {headerText}
            </div>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "4px" }}>
              <span style={{ color: "#e74c3c", fontWeight: "bold", fontSize: "14px" }}>•</span>
              <span style={{ flex: 1, lineHeight: "1.5" }}>{renderInlineFormatting(content, isDark)}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", paddingLeft: "4px" }}>
              <span style={{ color: isDark ? "#ff6b6b" : "#8B0000", fontWeight: "700", minWidth: "18px", fontSize: "13px" }}>
                {numMatch[1]}.
              </span>
              <span style={{ flex: 1, lineHeight: "1.5" }}>{renderInlineFormatting(numMatch[2], isDark)}</span>
            </div>
          );
        }

        return (
          <p key={idx} style={{ margin: "0", lineHeight: "1.6" }}>
            {renderInlineFormatting(line, isDark)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineFormatting(text, isDark) {
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
        <strong key={match.index} style={{ color: isDark ? "#ffffff" : "#111", fontWeight: "600" }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            backgroundColor: isDark ? "#3a1e1e" : "#f5e6e6",
            color: isDark ? "#ff8888" : "#8B0000",
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

// Web Audio synthesizer for pleasant UI sound effects
function playSound(type = "send") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "send") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "receive") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {
    // Ignore audio failures if restricted
  }
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
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeModal, setActiveModal] = useState(null); // 'cgpa' | 'attendance' | 'fees' | null

  // CGPA Calculator State
  const [courses, setCourses] = useState([
    { name: "Subject 1", credits: 4, grade: "A+" },
    { name: "Subject 2", credits: 4, grade: "A" },
    { name: "Subject 3", credits: 3, grade: "O" },
    { name: "Subject 4", credits: 3, grade: "B+" },
    { name: "Subject 5", credits: 2, grade: "A" },
  ]);
  const [prevCgpa, setPrevCgpa] = useState("");
  const [prevCredits, setPrevCredits] = useState("");

  // Attendance Calculator State
  const [totalClasses, setTotalClasses] = useState(40);
  const [attendedClasses, setAttendedClasses] = useState(32);

  // Fee Calculator State
  const [selectedCourse, setSelectedCourse] = useState("btech_cse");
  const [scholarshipBracket, setScholarshipBracket] = useState("cat1");

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

  // Voice Recognition Setup
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
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

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

  // Generate context-aware follow-ups
  const generateFollowUps = (q, answer) => {
    const text = (q + " " + answer).toLowerCase();
    const suggestions = [];

    if (text.includes("hostel") || text.includes("room") || text.includes("mess")) {
      suggestions.push("How to apply for a hostel gate pass on UMS?", "What are the mess meal timings?", "What are the curfew hours?");
    } else if (text.includes("fee") || text.includes("scholarship") || text.includes("cost")) {
      suggestions.push("What are the LPUNEST scholarship brackets?", "How to pay fees via LPU Pay portal?", "Are there sibling discounts?");
    } else if (text.includes("exam") || text.includes("mtt") || text.includes("ete") || text.includes("attendance")) {
      suggestions.push("What happens if attendance is below 75%?", "How do I apply for reappear exams?", "How to download the exam admit card?");
    } else if (text.includes("placement") || text.includes("salary") || text.includes("job") || text.includes("package")) {
      suggestions.push("Which top MNCs recruit from LPU?", "What is the average package for CSE?", "How does the Center for Professional Enhancement (CPE) train us?");
    } else if (text.includes("admission") || text.includes("lpunest") || text.includes("eligibility")) {
      suggestions.push("What documents are required for admission?", "What is the LPUNEST exam syllabus?", "What B.Tech courses are available?");
    } else {
      suggestions.push("Tell me about LPU's NAAC A++ accreditation", "What facilities are in the Central Library?", "How do I use the UMS student portal?");
    }

    setFollowUps(suggestions.slice(0, 3));
  };

  const handleSend = async (customQuestion) => {
    const qToSend = (typeof customQuestion === "string" ? customQuestion : question).trim();
    if (!qToSend || loading) return;

    const time = now();
    playSound("send");
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
          playSound("receive");
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

  const handleSpeak = (text, index) => {
    if (!window.speechSynthesis) return;
    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#`_•]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
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

  // Export Chat to Text File
  const handleExportChat = () => {
    if (messages.length === 0) {
      alert("No messages to export yet!");
      return;
    }
    const transcript = messages
      .map((m) => `[${m.time}] ${m.sender === "user" ? "YOU" : "LPU AI"}:\n${m.text}\n`)
      .join("\n----------------------------------------\n\n");
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LPU_AI_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Category Filters
  const categories = [
    { id: "all", label: "🌟 All Topics" },
    { id: "admissions", label: "🎓 Admissions", query: "What are the admission steps and LPUNEST dates?" },
    { id: "fees", label: "💰 Fees & Aid", query: "What is the fee structure and scholarship details?" },
    { id: "hostel", label: "🏠 Hostel Life", query: "Tell me about hostel room options, fees, and mess food." },
    { id: "exams", label: "📝 Exams & UMS", query: "What is the MTT, ETE examination pattern and 75% attendance rule?" },
    { id: "placements", label: "💼 Placements", query: "What are the top placement packages and recruiting companies?" },
    { id: "rankings", label: "🏆 NAAC & Rankings", query: "What is LPU's NAAC grade and NIRF ranking?" },
  ];

  // CGPA Calculation Helpers
  const calculateSgpa = () => {
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach((c) => {
      const cr = parseFloat(c.credits) || 0;
      const pt = GRADE_POINTS[c.grade] ?? 0;
      totalPoints += cr * pt;
      totalCredits += cr;
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
  };

  const calculateCgpa = (currentSgpa) => {
    const pC = parseFloat(prevCredits) || 0;
    const pG = parseFloat(prevCgpa) || 0;
    const curCreds = courses.reduce((acc, c) => acc + (parseFloat(c.credits) || 0), 0);
    const curPts = parseFloat(currentSgpa) * curCreds;
    const totalCreds = pC + curCreds;
    if (totalCreds === 0) return currentSgpa;
    return ((pG * pC + curPts) / totalCreds).toFixed(2);
  };

  const currentSgpa = calculateSgpa();
  const finalCgpa = calculateCgpa(currentSgpa);

  // Attendance Calculation Helpers
  const attendancePct = totalClasses > 0 ? ((attendedClasses / totalClasses) * 100).toFixed(1) : "0.0";
  const getBunkStatus = () => {
    const total = parseInt(totalClasses) || 0;
    const att = parseInt(attendedClasses) || 0;
    if (total === 0) return { text: "Enter class numbers", color: "#888" };

    const currentRate = att / total;
    if (currentRate >= 0.75) {
      // How many classes can be safely skipped
      const safeSkips = Math.floor((att - 0.75 * total) / 0.75);
      return {
        text: `🎉 You are safe! You can safely miss ${Math.max(0, safeSkips)} more class(es) without falling below 75%.`,
        color: "#27ae60",
      };
    } else {
      // How many classes must be attended consecutively
      const needed = Math.ceil((0.75 * total - att) / 0.25);
      return {
        text: `⚠️ Attendance below 75%! You must attend the next ${needed} classes consecutively to be exam eligible.`,
        color: "#c0392b",
      };
    }
  };

  // Fees Estimator Lookup
  const courseFeeTable = {
    btech_cse: { name: "B.Tech Computer Science (CSE)", base: 160000 },
    btech_ai: { name: "B.Tech AI & Data Science", base: 190000 },
    bba: { name: "BBA (Bachelor of Business Admin)", base: 85000 },
    mba: { name: "MBA (Master of Business Admin)", base: 150000 },
    bca: { name: "BCA (Computer Applications)", base: 80000 },
    bpharm: { name: "B.Pharm (Pharmacy)", base: 120000 },
  };

  const scholarshipPct = {
    none: 0,
    cat3: 0.2, // 20%
    cat2: 0.35, // 35%
    cat1: 0.5, // 50%
  };

  const selectedBaseFee = courseFeeTable[selectedCourse]?.base || 160000;
  const discountAmt = selectedBaseFee * (scholarshipPct[scholarshipBracket] || 0);
  const netSemFee = selectedBaseFee - discountAmt;

  const currentTheme = isDark
    ? {
        bg: "#121214",
        cardBg: "#1e1e24",
        text: "#f0f0f0",
        subText: "#aaa",
        border: "#33333e",
        headerBg: "linear-gradient(135deg, #420000 0%, #7a1515 100%)",
        bubbleAi: "#1e1e24",
        bubbleUser: "linear-gradient(135deg, #7a1515 0%, #9e1f1f 100%)",
        inputBg: "#1a1a20",
      }
    : {
        bg: "#fdf8f8",
        cardBg: "#ffffff",
        text: "#2c3e50",
        subText: "#666666",
        border: "#f0e4e4",
        headerBg: "linear-gradient(135deg, #6d0000 0%, #a92215 100%)",
        bubbleAi: "#ffffff",
        bubbleUser: "linear-gradient(135deg, #8B0000 0%, #b02a1e 100%)",
        inputBg: "#faf5f5",
      };

  return (
    <div style={{ ...styles.container, backgroundColor: currentTheme.bg }}>
      {/* Global CSS */}
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.7); } 70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(192, 57, 43, 0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(192, 57, 43, 0); } }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-7px); } }
        .msg-enter { animation: fadeSlideIn 0.3s ease forwards; }
        .modal-enter { animation: modalPop 0.25s ease forwards; }
        .btn-hover:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(139,0,0,0.25); filter: brightness(1.05); }
        .action-btn:hover { background-color: ${isDark ? "#2d2d38" : "#fcebeb"} !important; color: #e74c3c !important; }
        .mic-listening { animation: pulse 1.5s infinite !important; background-color: #c0392b !important; color: white !important; }
        input:focus, select:focus { border-color: #c0392b !important; outline: none; box-shadow: 0 0 0 3px rgba(192, 57, 43, 0.15) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${currentTheme.bg}; }
        ::-webkit-scrollbar-thumb { background: #d98880; border-radius: 3px; }
      `}</style>

      {/* Top Header */}
      <div style={{ ...styles.header, background: currentTheme.headerBg }}>
        <div style={styles.headerLeft}>
          <div style={styles.logoCircle}>LPU</div>
          <div>
            <div style={styles.headerTitle}>🎓 College Info AI</div>
            <div style={styles.headerSubtitle}>Lovely Professional University • Elite Student Companion</div>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Quick Tools Buttons */}
          <button
            className="btn-hover"
            style={styles.toolBtn}
            onClick={() => setActiveModal("cgpa")}
            title="Calculate SGPA and CGPA"
          >
            📊 CGPA Adder
          </button>
          <button
            className="btn-hover"
            style={styles.toolBtn}
            onClick={() => setActiveModal("attendance")}
            title="75% Attendance Calculator"
          >
            🎯 75% Bunk Meter
          </button>
          <button
            className="btn-hover"
            style={styles.toolBtn}
            onClick={() => setActiveModal("fees")}
            title="Fee & Scholarship Calculator"
          >
            💰 Fee Estimator
          </button>

          {/* Dark Mode Toggle */}
          <button
            style={styles.themeToggleBtn}
            onClick={() => setIsDark(!isDark)}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            style={styles.iconBtn}
            onClick={handleExportChat}
            title="Download conversation transcript"
          >
            📥 Export
          </button>

          <div style={styles.userBadge}>
            <span style={styles.onlineDot}>●</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "white" }}>
              {user?.name || "Student"}
            </span>
          </div>

          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Category Pills Navigation Bar */}
      <div style={{ ...styles.categoryBar, backgroundColor: currentTheme.cardBg, borderBottom: `1px solid ${currentTheme.border}` }}>
        <div style={styles.categoryScroll}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryChip,
                backgroundColor: activeTab === cat.id ? "#8B0000" : isDark ? "#282832" : "#f7eeee",
                color: activeTab === cat.id ? "#ffffff" : isDark ? "#cccccc" : "#8B0000",
                borderColor: activeTab === cat.id ? "#8B0000" : isDark ? "#3f3f4e" : "#eddcdc",
              }}
              onClick={() => {
                setActiveTab(cat.id);
                if (cat.query) handleSend(cat.query);
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Conversation Area */}
      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎓</div>
            <h2 style={{ ...styles.emptyTitle, color: isDark ? "#ff7675" : "#8B0000" }}>
              Welcome, {user?.name || "Student"}!
            </h2>
            <p style={{ ...styles.emptyText, color: currentTheme.subText }}>
              I am your human-like AI companion for <strong>Lovely Professional University</strong>. Ask me anything, speak with voice, or launch our interactive calculators above!
            </p>

            {/* Quick Interactive Features Card Grid */}
            <div style={styles.featureCardsGrid}>
              <div
                style={{ ...styles.featureCard, backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }}
                onClick={() => setActiveModal("cgpa")}
              >
                <div style={{ fontSize: "28px" }}>📊</div>
                <div style={{ fontWeight: "700", color: isDark ? "#fff" : "#8B0000", fontSize: "14px" }}>CGPA Adder</div>
                <div style={{ fontSize: "11px", color: currentTheme.subText }}>Compute SGPA & Multi-Semester CGPA</div>
              </div>
              <div
                style={{ ...styles.featureCard, backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }}
                onClick={() => setActiveModal("attendance")}
              >
                <div style={{ fontSize: "28px" }}>🎯</div>
                <div style={{ fontWeight: "700", color: isDark ? "#fff" : "#8B0000", fontSize: "14px" }}>75% Bunk Meter</div>
                <div style={{ fontSize: "11px", color: currentTheme.subText }}>Check how many classes you can skip</div>
              </div>
              <div
                style={{ ...styles.featureCard, backgroundColor: currentTheme.cardBg, borderColor: currentTheme.border }}
                onClick={() => setActiveModal("fees")}
              >
                <div style={{ fontSize: "28px" }}>💰</div>
                <div style={{ fontWeight: "700", color: isDark ? "#fff" : "#8B0000", fontSize: "14px" }}>Fee Calculator</div>
                <div style={{ fontSize: "11px", color: currentTheme.subText }}>Estimate tuition & scholarship waiver</div>
              </div>
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

            <div style={{ display: "flex", flexDirection: "column", maxWidth: "78%" }}>
              <div
                style={{
                  ...styles.bubble,
                  ...(msg.sender === "user"
                    ? { background: currentTheme.bubbleUser, color: "#ffffff", borderBottomRightRadius: "4px" }
                    : { backgroundColor: currentTheme.bubbleAi, color: currentTheme.text, border: `1px solid ${currentTheme.border}`, borderBottomLeftRadius: "4px" }),
                }}
              >
                {msg.sender === "ai" ? (
                  <FormattedText text={msg.text} isDark={isDark} />
                ) : (
                  <span>{msg.text}</span>
                )}

                {/* Toolbar for AI Responses */}
                {msg.sender === "ai" && msg.text && (
                  <div style={{ ...styles.actionToolbar, borderTop: `1px solid ${isDark ? "#2f2f3a" : "#f4e8e8"}` }}>
                    <button
                      className="action-btn"
                      style={{ ...styles.actionBtn, borderColor: currentTheme.border, color: currentTheme.subText }}
                      onClick={() => handleCopy(msg.text, index)}
                      title="Copy text"
                    >
                      {copiedIndex === index ? "✅ Copied" : "📋 Copy"}
                    </button>
                    <button
                      className="action-btn"
                      style={{
                        ...styles.actionBtn,
                        borderColor: currentTheme.border,
                        color: speakingIndex === index ? "#e74c3c" : currentTheme.subText,
                        fontWeight: speakingIndex === index ? "700" : "500",
                      }}
                      onClick={() => handleSpeak(msg.text, index)}
                      title={speakingIndex === index ? "Stop voice" : "Read aloud"}
                    >
                      {speakingIndex === index ? "⏹️ Stop" : "🔊 Listen"}
                    </button>
                    <div style={{ display: "flex", gap: "4px", marginLeft: "auto" }}>
                      <button
                        className="action-btn"
                        style={{
                          ...styles.ratingBtn,
                          backgroundColor: feedback[index] === "up" ? (isDark ? "#143322" : "#eafaf1") : "transparent",
                          borderColor: feedback[index] === "up" ? "#2ecc71" : currentTheme.border,
                        }}
                        onClick={() => handleFeedback(index, "up")}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className="action-btn"
                        style={{
                          ...styles.ratingBtn,
                          backgroundColor: feedback[index] === "down" ? (isDark ? "#381a1a" : "#fdedec") : "transparent",
                          borderColor: feedback[index] === "down" ? "#e74c3c" : currentTheme.border,
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
              <div style={{ ...styles.timestamp, textAlign: msg.sender === "user" ? "right" : "left", color: isDark ? "#666" : "#aaa" }}>
                {msg.time}
              </div>
            </div>

            {msg.sender === "user" && (
              <div style={styles.userAvatar}>{(user?.name || "U")[0].toUpperCase()}</div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="msg-enter" style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
            <div style={styles.aiAvatar}>AI</div>
            <div style={{ ...styles.bubble, backgroundColor: currentTheme.bubbleAi, border: `1px solid ${currentTheme.border}`, padding: "14px 20px" }}>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: currentTheme.subText, marginRight: "4px" }}>Thinking</span>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span key={i} style={{ ...styles.dot, animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Contextual Follow-up Chips */}
        {followUps.length > 0 && !loading && (
          <div style={styles.followUpContainer} className="msg-enter">
            <div style={{ ...styles.followUpTitle, color: isDark ? "#ff7675" : "#8B0000" }}>💡 Suggested follow-ups:</div>
            <div style={styles.followUpChips}>
              {followUps.map((chip, idx) => (
                <button
                  key={idx}
                  className="btn-hover"
                  style={{
                    ...styles.followUpChip,
                    backgroundColor: isDark ? "#281818" : "#fff0f0",
                    color: isDark ? "#ff8888" : "#8B0000",
                    borderColor: isDark ? "#4d2222" : "#f0b0a8",
                  }}
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
      <div style={{ ...styles.inputArea, backgroundColor: currentTheme.cardBg, borderTop: `1px solid ${currentTheme.border}` }}>
        <button
          className={isListening ? "mic-listening" : "action-btn"}
          style={{
            ...styles.micBtn,
            backgroundColor: isListening ? "#c0392b" : isDark ? "#2a1c1c" : "#f7e8e8",
            color: isListening ? "white" : "#8B0000",
            borderColor: isDark ? "#4a2c2c" : "#edd5d5",
          }}
          onClick={toggleVoiceInput}
          title={isListening ? "Listening... click to stop" : "Click to speak"}
          disabled={loading}
        >
          {isListening ? "🎙️" : "🎤"}
        </button>

        <input
          style={{
            ...styles.input,
            backgroundColor: currentTheme.inputBg,
            color: currentTheme.text,
            borderColor: currentTheme.border,
          }}
          type="text"
          placeholder={isListening ? "Listening... speak now" : "Ask anything about LPU (Admissions, Fees, Placements, Exams)..."}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button
          className="btn-hover"
          style={{
            ...styles.sendBtn,
            opacity: loading || !question.trim() ? 0.5 : 1,
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
          }}
          onClick={() => handleSend()}
          disabled={loading || !question.trim()}
          title="Send query"
        >
          ➤
        </button>
      </div>

      {/* ================= MODAL: CGPA / SGPA CALCULATOR ================= */}
      {activeModal === "cgpa" && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div
            className="modal-enter"
            style={{ ...styles.modalContent, backgroundColor: currentTheme.cardBg, color: currentTheme.text, borderColor: currentTheme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: isDark ? "#ff7675" : "#8B0000" }}>📊 LPU CGPA & SGPA Adder</h3>
              <button style={styles.closeBtn} onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.resultBanner}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: currentTheme.subText }}>SEMESTER SGPA</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#8B0000" }}>{currentSgpa}</div>
                </div>
                <div style={{ width: "1px", height: "40px", backgroundColor: "#ddd" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: currentTheme.subText }}>CUMULATIVE CGPA</div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#27ae60" }}>{finalCgpa}</div>
                </div>
              </div>

              {/* Multi-Semester Aggregator Inputs */}
              <div style={{ display: "flex", gap: "10px", margin: "14px 0" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: currentTheme.subText }}>Previous CGPA (optional):</label>
                  <input
                    style={{ ...styles.modalInput, backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                    type="number"
                    step="0.01"
                    placeholder="e.g. 8.4"
                    value={prevCgpa}
                    onChange={(e) => setPrevCgpa(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "11px", color: currentTheme.subText }}>Previous Total Credits:</label>
                  <input
                    style={{ ...styles.modalInput, backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                    type="number"
                    placeholder="e.g. 45"
                    value={prevCredits}
                    onChange={(e) => setPrevCredits(e.target.value)}
                  />
                </div>
              </div>

              {/* Course Row Items */}
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {courses.map((course, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      style={{ ...styles.modalInput, flex: 2, backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                      type="text"
                      value={course.name}
                      onChange={(e) => {
                        const copy = [...courses];
                        copy[idx].name = e.target.value;
                        setCourses(copy);
                      }}
                    />
                    <select
                      style={{ ...styles.modalInput, flex: 1, backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                      value={course.credits}
                      onChange={(e) => {
                        const copy = [...courses];
                        copy[idx].credits = e.target.value;
                        setCourses(copy);
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6].map((cr) => (
                        <option key={cr} value={cr}>{cr} Cr</option>
                      ))}
                    </select>
                    <select
                      style={{ ...styles.modalInput, flex: 1, fontWeight: "700", backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                      value={course.grade}
                      onChange={(e) => {
                        const copy = [...courses];
                        copy[idx].grade = e.target.value;
                        setCourses(copy);
                      }}
                    >
                      {Object.keys(GRADE_POINTS).map((gr) => (
                        <option key={gr} value={gr}>{gr} ({GRADE_POINTS[gr]} pts)</option>
                      ))}
                    </select>
                    <button
                      style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: "16px" }}
                      onClick={() => setCourses(courses.filter((_, i) => i !== idx))}
                      title="Remove course"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                style={{ ...styles.addBtn, marginTop: "12px" }}
                onClick={() => setCourses([...courses, { name: `Subject ${courses.length + 1}`, credits: 3, grade: "A" }])}
              >
                ➕ Add Another Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: 75% ATTENDANCE BUNK METER ================= */}
      {activeModal === "attendance" && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div
            className="modal-enter"
            style={{ ...styles.modalContent, backgroundColor: currentTheme.cardBg, color: currentTheme.text, borderColor: currentTheme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: isDark ? "#ff7675" : "#8B0000" }}>🎯 LPU 75% Attendance Bunk Meter</h3>
              <button style={styles.closeBtn} onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "36px", fontWeight: "900", color: parseFloat(attendancePct) >= 75 ? "#27ae60" : "#c0392b" }}>
                  {attendancePct}%
                </div>
                <div style={{ fontSize: "12px", color: currentTheme.subText }}>Current Attendance Percentage</div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Total Classes Held:</label>
                  <input
                    style={{ ...styles.modalInput, width: "100%", backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                    type="number"
                    value={totalClasses}
                    onChange={(e) => setTotalClasses(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "12px", fontWeight: "600" }}>Classes Attended:</label>
                  <input
                    style={{ ...styles.modalInput, width: "100%", backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                    type="number"
                    value={attendedClasses}
                    onChange={(e) => setAttendedClasses(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: isDark ? "#2b1c1c" : "#fef4f4", border: "1px solid #f2c8c8", color: getBunkStatus().color, fontWeight: "600", fontSize: "13px", lineHeight: "1.5" }}>
                {getBunkStatus().text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FEE & SCHOLARSHIP ESTIMATOR ================= */}
      {activeModal === "fees" && (
        <div style={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div
            className="modal-enter"
            style={{ ...styles.modalContent, backgroundColor: currentTheme.cardBg, color: currentTheme.text, borderColor: currentTheme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: isDark ? "#ff7675" : "#8B0000" }}>💰 LPU Fee & Scholarship Calculator</h3>
              <button style={styles.closeBtn} onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>Select Academic Programme:</label>
                <select
                  style={{ ...styles.modalInput, width: "100%", backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  {Object.entries(courseFeeTable).map(([k, v]) => (
                    <option key={k} value={k}>{v.name} (Base: ₹{v.base.toLocaleString()}/sem)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600" }}>LPUNEST Score / Board Exam Bracket:</label>
                <select
                  style={{ ...styles.modalInput, width: "100%", backgroundColor: currentTheme.inputBg, color: currentTheme.text, borderColor: currentTheme.border }}
                  value={scholarshipBracket}
                  onChange={(e) => setScholarshipBracket(e.target.value)}
                >
                  <option value="none">No Scholarship (0% waiver)</option>
                  <option value="cat3">Category III (20% fee waiver)</option>
                  <option value="cat2">Category II (35% fee waiver)</option>
                  <option value="cat1">Category I - Top Rank (50% fee waiver)</option>
                </select>
              </div>

              <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: isDark ? "#1f2a24" : "#edf7ed", border: "1px solid #c8e6c9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px" }}>
                  <span>Original Semester Fee:</span>
                  <span style={{ fontWeight: "700" }}>₹{selectedBaseFee.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "13px", color: "#27ae60" }}>
                  <span>Scholarship Discount ({(scholarshipPct[scholarshipBracket] * 100).toFixed(0)}%):</span>
                  <span style={{ fontWeight: "700" }}>- ₹{discountAmt.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #c8e6c9", paddingTop: "6px", fontSize: "15px", fontWeight: "800", color: isDark ? "#a3e9a4" : "#1e7e34" }}>
                  <span>Net Tuition Fee Per Sem:</span>
                  <span>₹{netSemFee.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    padding: "10px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    zIndex: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  logoCircle: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    backgroundColor: "white",
    color: "#8B0000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "900",
    fontSize: "13px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  headerTitle: { fontSize: "16px", fontWeight: "700", color: "white" },
  headerSubtitle: { fontSize: "11px", opacity: 0.85, color: "white" },
  headerRight: { display: "flex", alignItems: "center", gap: "8px" },
  toolBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "5px 10px",
    borderRadius: "16px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
    transition: "all 0.2s",
  },
  themeToggleBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "5px 10px",
    borderRadius: "16px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },
  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.25)",
    padding: "5px 10px",
    borderRadius: "16px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "600",
  },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "4px 10px",
    borderRadius: "16px",
  },
  onlineDot: { color: "#2ecc71", fontSize: "10px" },
  logoutBtn: {
    backgroundColor: "white",
    color: "#8B0000",
    border: "none",
    padding: "5px 12px",
    borderRadius: "16px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "11px",
  },
  categoryBar: {
    padding: "8px 16px",
    overflowX: "auto",
  },
  categoryScroll: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  categoryChip: {
    padding: "5px 12px",
    borderRadius: "16px",
    border: "1px solid",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emptyState: {
    textAlign: "center",
    margin: "auto",
    padding: "10px 0 20px 0",
    maxWidth: "580px",
  },
  emptyIcon: { fontSize: "46px", marginBottom: "8px" },
  emptyTitle: { margin: "0 0 6px 0", fontSize: "22px", fontWeight: "700" },
  emptyText: { marginBottom: "20px", fontSize: "13px", lineHeight: "1.6" },
  featureCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    marginTop: "10px",
  },
  featureCard: {
    padding: "14px 10px",
    borderRadius: "12px",
    border: "1px solid",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    marginBottom: "8px",
  },
  aiAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: "bold",
    flexShrink: 0,
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2c3e50, #4a6572)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "bold",
    flexShrink: 0,
  },
  bubble: {
    padding: "12px 16px",
    borderRadius: "16px",
    fontSize: "14px",
    lineHeight: "1.6",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    wordBreak: "break-word",
  },
  actionToolbar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "10px",
    paddingTop: "6px",
  },
  actionBtn: {
    background: "none",
    border: "1px solid",
    borderRadius: "12px",
    padding: "3px 8px",
    fontSize: "11px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  ratingBtn: {
    background: "none",
    border: "1px solid",
    borderRadius: "10px",
    padding: "2px 6px",
    fontSize: "11px",
    cursor: "pointer",
  },
  timestamp: {
    fontSize: "10px",
    marginTop: "3px",
    paddingLeft: "4px",
    paddingRight: "4px",
  },
  dot: {
    width: "6px",
    height: "6px",
    backgroundColor: "#c0392b",
    borderRadius: "50%",
    display: "inline-block",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  followUpContainer: {
    marginLeft: "40px",
    marginTop: "2px",
    marginBottom: "8px",
  },
  followUpTitle: {
    fontSize: "11px",
    fontWeight: "700",
    marginBottom: "4px",
  },
  followUpChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
  },
  followUpChip: {
    padding: "5px 10px",
    borderRadius: "14px",
    border: "1px solid",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  inputArea: {
    padding: "12px 18px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 -2px 15px rgba(0,0,0,0.03)",
  },
  micBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "1px solid",
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.2s",
  },
  input: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: "20px",
    border: "1.5px solid",
    fontSize: "14px",
    transition: "all 0.2s ease",
  },
  sendBtn: {
    width: "40px",
    height: "40px",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white",
    border: "none",
    borderRadius: "50%",
    fontSize: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "20px",
  },
  modalContent: {
    width: "100%",
    maxWidth: "460px",
    borderRadius: "16px",
    border: "1px solid",
    boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: "16px",
    cursor: "pointer",
    color: "#888",
  },
  modalBody: {
    padding: "16px 18px",
  },
  resultBanner: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    padding: "12px",
    borderRadius: "12px",
    backgroundColor: "rgba(139, 0, 0, 0.06)",
    border: "1px solid rgba(139, 0, 0, 0.12)",
  },
  modalInput: {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "12px",
    boxSizing: "border-box",
  },
  addBtn: {
    width: "100%",
    padding: "8px",
    backgroundColor: "transparent",
    border: "1.5px dashed #c0392b",
    color: "#8B0000",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
};

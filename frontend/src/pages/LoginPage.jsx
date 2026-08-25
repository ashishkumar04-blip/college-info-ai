import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await login(email, password);
      loginUser(response.data.access_token, response.data.user_name);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: slideUp 0.5s ease; }
        .login-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,0,0,0.4) !important; }
        input:focus { border-color: #8B0000 !important; box-shadow: 0 0 0 3px rgba(139,0,0,0.12) !important; outline: none; }
      `}</style>

      {/* Background decoration */}
      <div style={styles.bgCircle1} />
      <div style={styles.bgCircle2} />

      <div className="login-card" style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>LPU</div>
          <h1 style={styles.appName}>🎓 College Info AI</h1>
          <p style={styles.tagline}>Your Smart Guide to Lovely Professional University</p>
        </div>

        <h2 style={styles.heading}>Welcome Back!</h2>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>📧 Email Address</label>
            <input
              style={styles.input}
              type="email"
              placeholder="yourname@lpu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>🔒 Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            className="login-btn"
            type="submit"
            style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login →"}
          </button>
        </form>

        <p style={styles.switchText}>
          Don't have an account?{" "}
          <span style={styles.link} onClick={() => navigate("/signup")}>
            Create Account
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #6d0000 0%, #c0392b 50%, #e74c3c 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    position: "relative",
    overflow: "hidden",
    padding: "20px",
  },
  bgCircle1: {
    position: "absolute", top: "-100px", right: "-100px",
    width: "350px", height: "350px", borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bgCircle2: {
    position: "absolute", bottom: "-80px", left: "-80px",
    width: "280px", height: "280px", borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "20px",
    padding: "36px 32px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
    position: "relative",
    zIndex: 1,
  },
  logoWrap: { textAlign: "center", marginBottom: "20px" },
  logo: {
    width: "60px", height: "60px", borderRadius: "50%",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white", fontWeight: "900", fontSize: "18px",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 10px auto", boxShadow: "0 4px 15px rgba(139,0,0,0.3)",
  },
  appName: { margin: "0 0 4px 0", fontSize: "20px", color: "#2c3e50" },
  tagline: { margin: 0, fontSize: "12px", color: "#888" },
  heading: { textAlign: "center", color: "#8B0000", margin: "0 0 20px 0", fontSize: "20px" },
  errorBox: {
    backgroundColor: "#ffeaea", border: "1px solid #f5c6cb",
    color: "#c0392b", padding: "10px 14px", borderRadius: "10px",
    marginBottom: "16px", fontSize: "13px",
  },
  field: { marginBottom: "16px" },
  label: { display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#555" },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    border: "1.5px solid #e0e0e0", fontSize: "14px",
    transition: "all 0.2s ease", boxSizing: "border-box",
    backgroundColor: "#fafafa",
  },
  btn: {
    width: "100%", padding: "13px",
    background: "linear-gradient(135deg, #8B0000, #c0392b)",
    color: "white", border: "none", borderRadius: "10px",
    fontSize: "15px", fontWeight: "bold", cursor: "pointer",
    marginTop: "8px", transition: "all 0.2s ease",
    boxShadow: "0 4px 15px rgba(139,0,0,0.3)",
  },
  switchText: { textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#888" },
  link: { color: "#8B0000", cursor: "pointer", fontWeight: "bold" },
};

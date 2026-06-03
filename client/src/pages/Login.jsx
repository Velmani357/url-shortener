import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return toast.error("Please fill in all fields");

    try {
      setLoading(true);

      const url = isLogin
        ? `${BASE_URL}/login`
        : `${BASE_URL}/signup`;

      const res = await axios.post(url, { email, password });

      if (isLogin) {
        localStorage.setItem("token", res.data.token);
        toast.success("Welcome back! Redirecting...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        toast.success("Account created successfully! Please login.");
        setIsLogin(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        zIndex: 999, // 🔥 IMPORTANT (above particles)
      }}
    >
      <div
        style={{
          width: "350px",
          padding: "30px",
          borderRadius: "15px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          color: "white",
          textAlign: "center",
          border: "1px solid rgba(0,240,255,0.3)",
        }}
      >
        <h2>{isLogin ? "Welcome Back 👋" : "Create Account 🚀"}</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <button onClick={submit} style={btnStyle}>
          {loading ? "Loading..." : isLogin ? "Login" : "Register"}
        </button>

        <p
          onClick={() => setIsLogin(!isLogin)}
          style={{ color: "#00f0ff", cursor: "pointer" }}
        >
          {isLogin ? "Create account" : "Already have account?"}
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  margin: "8px 0",
  borderRadius: "8px",
  border: "1px solid #00f0ff",
  background: "transparent",
  color: "white",
};

const btnStyle = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  borderRadius: "8px",
  border: "none",
  background: "#00f0ff",
  fontWeight: "bold",
  cursor: "pointer",
};
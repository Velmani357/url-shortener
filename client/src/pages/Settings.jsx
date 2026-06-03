import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSettings, FiKey, FiCpu, FiUser, FiEye, FiEyeOff, FiCopy, FiCheck } from "react-icons/fi";
import "./Dashboard.css";

export default function Settings() {
  const { userEmail, urls } = useOutletContext();
  
  // Developer API states
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Form preference states
  const [defaultExpiryDays, setDefaultExpiryDays] = useState("30");
  const [defaultDomain, setDefaultDomain] = useState("http://localhost:5000");
  const [themeColor, setThemeColor] = useState("cyan");

  useEffect(() => {
    // Retrieve mock API key or generate one
    const storedKey = localStorage.getItem("nexus_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      const generated = "nx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("nexus_api_key", generated);
      setApiKey(generated);
    }
  }, []);

  const handleGenerateNewKey = () => {
    if (!window.confirm("Generating a new API key will invalidate your old key. Do you want to proceed?")) return;
    const generated = "nx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("nexus_api_key", generated);
    setApiKey(generated);
    toast.success("New developer API key generated!");
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast.success("API key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem("pref_expiry_days", defaultExpiryDays);
    localStorage.setItem("pref_domain", defaultDomain);
    localStorage.setItem("pref_theme", themeColor);
    toast.success("Preferences updated successfully!");
  };

  return (
    <>
      <div className="page-header">
        <h1>User Settings</h1>
      </div>
      <p className="page-description">Configure your SaaS account, manage developer API keys, and set URL defaults.</p>

      <div className="analytics-layout" style={{ marginTop: "20px" }}>
        {/* Account Details */}
        <div className="glass-panel">
          <h3 className="panel-title"><FiUser /> Account Profile</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Registered Email</span>
              <span style={{ fontWeight: "bold", fontSize: "14px" }}>{userEmail}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Current Tier</span>
              <span style={{ color: "var(--cyan)", fontWeight: "bold", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                💎 Developer Pro
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Total Links Created</span>
              <span style={{ fontWeight: "bold", fontSize: "14px" }}>{urls.length} URLs</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Account Status</span>
              <span style={{ color: "var(--green)", fontWeight: "bold", fontSize: "14px" }}>Active / Verified</span>
            </div>
          </div>
        </div>

        {/* Developer API Key */}
        <div className="glass-panel">
          <h3 className="panel-title"><FiKey /> API Developer Credentials</h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "15px", lineHeight: "1.4" }}>
            Integrate our URL shortener service into your external workflows using your private API token credentials.
          </p>

          <div style={{ position: "relative", display: "flex", gap: "8px", alignItems: "center" }}>
            <input 
              type={showKey ? "text" : "password"} 
              className="cyber-input" 
              value={apiKey} 
              readOnly 
              style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "14px", paddingRight: "45px", letterSpacing: showKey ? "0" : "4px" }}
            />
            <button 
              type="button" 
              onClick={() => setShowKey(!showKey)}
              style={{ position: "absolute", right: "50px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "10px", width: "auto" }}
            >
              {showKey ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
            <button 
              type="button"
              className="action-btn copy-btn"
              onClick={handleCopyKey}
              style={{ width: "42px", height: "42px", flexShrink: 0 }}
            >
              {copiedKey ? <FiCheck size={16} /> : <FiCopy size={16} />}
            </button>
          </div>

          <button 
            className="cyber-btn" 
            onClick={handleGenerateNewKey}
            style={{ width: "100%", marginTop: "15px", padding: "10px 18px", fontSize: "12px", background: "rgba(255, 0, 127, 0.1)", border: "1.5px solid var(--magenta)", color: "var(--magenta)", boxShadow: "none" }}
            onMouseEnter={(e) => { e.target.style.background = "var(--magenta)"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.background = "rgba(255, 0, 127, 0.1)"; e.target.style.color = "var(--magenta)"; }}
          >
            Regenerate API Token Key
          </button>
        </div>

        {/* Global Shortener Preferences */}
        <div className="glass-panel analytics-panel-full">
          <h3 className="panel-title"><FiCpu /> Global Preferences</h3>
          <form className="shortener-form" onSubmit={handleSavePreferences}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="input-group">
                <label className="input-label">Default Redirection Domain</label>
                <input 
                  type="text" 
                  className="cyber-input" 
                  value={defaultDomain} 
                  onChange={(e) => setDefaultDomain(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Default Expiry Period (Days)</label>
                <select 
                  className="cyber-input" 
                  value={defaultExpiryDays} 
                  onChange={(e) => setDefaultExpiryDays(e.target.value)}
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none" }}
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                  <option value="365">1 Year</option>
                  <option value="permanent">Never Expire (Permanent)</option>
                </select>
              </div>
            </div>

            <div className="input-group" style={{ marginTop: "10px" }}>
              <label className="input-label">Dashboard Theme Skin Color</label>
              <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="theme" 
                    value="cyan" 
                    checked={themeColor === "cyan"} 
                    onChange={() => setThemeColor("cyan")}
                  />
                  <span style={{ color: "var(--cyan)", fontWeight: "bold" }}>Cyber Cyan</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="theme" 
                    value="magenta" 
                    checked={themeColor === "magenta"} 
                    onChange={() => setThemeColor("magenta")}
                  />
                  <span style={{ color: "var(--magenta)", fontWeight: "bold" }}>Violet Matrix</span>
                </label>
              </div>
            </div>

            <button type="submit" className="cyber-btn" style={{ marginTop: "15px", maxWidth: "200px" }}>
              Save Preferences
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

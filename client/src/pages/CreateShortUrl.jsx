import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";
import { FiPlus, FiCheck, FiCopy, FiBarChart2 } from "react-icons/fi";
import "./Dashboard.css";

export default function CreateShortUrl() {
  const { fetchUrls } = useOutletContext();
  const navigate = useNavigate();

  const [longUrl, setLongUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastShortened, setLastShortened] = useState(null);

  const token = localStorage.getItem("token");

  const handleShorten = async (e) => {
    e.preventDefault();
    if (!longUrl) return toast.error("Please enter a long URL");

    try {
      setLoading(true);
      const res = await axios.post(
        `${BASE_URL}/shorten`,
        { longUrl, customAlias, expiresAt: expiresAt || null },
        { headers: { Authorization: token } }
      );
      
      toast.success("Short link created!");
      setLastShortened(res.data);
      setLongUrl("");
      setCustomAlias("");
      setExpiresAt("");
      setShowAdvanced(false);
      
      // Update shared state
      await fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error shortening URL");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (shortCode) => {
    const link = `${BASE_URL}/${shortCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Copied to clipboard!");
  };

  return (
    <>
      <div className="page-header">
        <h1>Create Short URL</h1>
      </div>
      <p className="page-description">Generate unique shortened links with options for aliases and expiry dates.</p>

      <div className="glass-panel" style={{ marginTop: "20px" }}>
        <h2 className="panel-title"><FiPlus /> Generate Short Link</h2>
        <form className="shortener-form" onSubmit={handleShorten}>
          <div className="input-group">
            <label className="input-label">Long Destination URL</label>
            <input 
              type="text" 
              className="cyber-input" 
              placeholder="e.g. https://github.com/google/deepmind/projects" 
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
            />
          </div>

          <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? "Hide Advanced Options ▾" : "Show Advanced Options (Alias, Expiry) ▸"}
          </div>

          {showAdvanced && (
            <div className="advanced-options">
              <div className="input-group">
                <label className="input-label">Custom Alias (Optional)</label>
                <input 
                  type="text" 
                  className="cyber-input" 
                  placeholder="e.g. deepmind-project" 
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Expiration Date (Optional)</label>
                <input 
                  type="datetime-local" 
                  className="cyber-input" 
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          )}

          <button type="submit" className="cyber-btn" disabled={loading} style={{ marginTop: "10px" }}>
            {loading ? "Creating..." : "Shorten URL"}
          </button>
        </form>
      </div>

      {lastShortened && (
        <div className="glass-panel success-panel" style={{ marginTop: "30px" }}>
          <h3 className="success-title"><FiCheck /> Short Link Created Successfully!</h3>
          <div className="success-box">
            <a 
              href={`${BASE_URL}/${lastShortened.shortCode}`}
              target="_blank"
              rel="noreferrer"
              className="success-link"
            >
              {`${BASE_URL}/${lastShortened.shortCode}`}
            </a>
            <div className="success-actions">
              <button 
                className="action-btn copy-btn"
                onClick={() => handleCopyLink(lastShortened.shortCode)}
                title="Copy Link"
              >
                <FiCopy />
              </button>
              <button 
                className="action-btn view-btn"
                onClick={() => navigate(`/dashboard/analytics?id=${lastShortened._id}`)}
                title="View Analytics"
              >
                <FiBarChart2 />
              </button>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Original Destination: <span style={{ color: "#fff", wordBreak: "break-all" }}>{lastShortened.longUrl}</span>
          </p>
        </div>
      )}
    </>
  );
}

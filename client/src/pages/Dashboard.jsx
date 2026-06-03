import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";
import { 
  FiGrid, FiPlus, FiLink, FiBarChart2, FiLayers, FiLogOut, FiGlobe,
  FiCopy, FiEdit2, FiTrash2, FiExternalLink, FiShare2, FiArrowRight,
  FiActivity, FiCheck, FiUploadCloud, FiSearch, FiCalendar, FiClock
} from "react-icons/fi";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from "chart.js";
import "./Dashboard.css";
// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState("overview"); // overview, shorten, links, analytics, bulk

  // Data States
  const [urls, setUrls] = useState([]);
  const [longUrl, setLongUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Search and selected analytics link
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(null);
  
  // Success card for shorten link
  const [lastShortened, setLastShortened] = useState(null);

  // Bulk CSV States
  const [bulkUrls, setBulkUrls] = useState([]);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSuccessLog, setBulkSuccessLog] = useState([]);

  // Modal for edit destination URL
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUrlId, setEditUrlId] = useState("");
  const [newDestination, setNewDestination] = useState("");
  
  // Clipboard copy state tracking
  const [copiedId, setCopiedId] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "User");
      } catch (e) {
        setUserEmail("SaaS User");
      }
    }
    fetchUrls();
  }, [token]);

  const fetchUrls = async () => {
    try {
      const res = await axios.get("http://localhost:5000/myurls", {
        headers: { Authorization: token },
      });
      setUrls(res.data);
      if (res.data.length > 0 && !selectedUrl) {
        setSelectedUrl(res.data[0]);
      } else if (selectedUrl) {
        const updated = res.data.find(u => u._id === selectedUrl._id);
        if (updated) setSelectedUrl(updated);
      }
    } catch (err) {
      toast.error("Failed to load URLs");
    }
  };

  const handleShorten = async (e) => {
    e.preventDefault();
    if (!longUrl) return toast.error("Please enter a long URL");

    try {
      setLoading(true);
      const res = await axios.post(
        "http://localhost:5000/shorten",
        { longUrl, customAlias, expiresAt: expiresAt || null },
        { headers: { Authorization: token } }
      );
      
      toast.success("Short link created!");
      setLastShortened(res.data);
      setLongUrl("");
      setCustomAlias("");
      setExpiresAt("");
      setShowAdvanced(false);
      
      await fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.message || "Error shortening URL");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this short URL?")) return;

    try {
      await axios.delete(`http://localhost:5000/url/${id}`, {
        headers: { Authorization: token },
      });
      toast.success("Link deleted");
      if (selectedUrl?._id === id) {
        setSelectedUrl(null);
      }
      fetchUrls();
    } catch (err) {
      toast.error("Failed to delete link");
    }
  };

  const handleEditClick = (url) => {
    setEditUrlId(url._id);
    setNewDestination(url.longUrl);
    setIsEditModalOpen(true);
  };

  const handleUpdateUrl = async () => {
    if (!newDestination) return toast.error("URL destination cannot be empty");

    try {
      const res = await axios.put(
        `http://localhost:5000/url/${editUrlId}`,
        { longUrl: newDestination },
        { headers: { Authorization: token } }
      );
      toast.success("Destination URL updated!");
      setIsEditModalOpen(false);
      fetchUrls();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update destination");
    }
  };

  const handleCopyLink = (shortCode, id) => {
    const link = `http://localhost:5000/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(""), 2000);
  };

  const handleShareLink = (shortCode) => {
    const link = `http://localhost:5000/${shortCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Nexus URL Shortener',
        text: 'Check out this shortened link!',
        url: link,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link);
      toast.success("Link copied! Ready to share.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // CSV Reader
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n");
      const urlsToShorten = [];

      for (let line of lines) {
        let trimmed = line.trim();
        if (trimmed) {
          const parts = trimmed.split(",");
          const potentialUrl = parts[0].trim();
          if (potentialUrl.startsWith("http://") || potentialUrl.startsWith("https://")) {
            urlsToShorten.push(potentialUrl);
          }
        }
      }

      if (urlsToShorten.length === 0) {
        return toast.error("No valid HTTP/HTTPS URLs found in CSV");
      }

      setBulkUrls(urlsToShorten);
      toast.success(`Parsed ${urlsToShorten.length} valid URLs from CSV.`);
    };
    reader.readAsText(file);
  };

  const handleProcessBulk = async () => {
    if (bulkUrls.length === 0) return toast.error("No URLs parsed yet. Upload a CSV first.");

    toast.loading(`Processing ${bulkUrls.length} URLs...`, { id: "bulk" });
    setBulkProgress(10);

    try {
      const res = await axios.post(
        "http://localhost:5000/shorten/bulk",
        { urls: bulkUrls },
        { headers: { Authorization: token } }
      );
      
      setBulkProgress(100);
      const successCount = res.data.results.length;
      const errCount = res.data.errors.length;
      
      toast.dismiss("bulk");
      toast.success(`Successfully shortened ${successCount} links!`);
      setBulkSuccessLog(res.data.results);
      setBulkUrls([]);
      fetchUrls();
    } catch (err) {
      toast.dismiss("bulk");
      toast.error("Bulk upload failed");
    } finally {
      setTimeout(() => setBulkProgress(0), 2000);
    }
  };

  // Download QR Code Canvas
  const downloadQRCode = (code) => {
    const canvas = document.getElementById(`qr-${code}`);
    if (!canvas) return toast.error("QR Code canvas not found");
    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `qr_${code}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  // Metrics
  const totalLinks = urls.length;
  const totalClicks = urls.reduce((acc, curr) => acc + curr.clickCount, 0);
  const activeLinks = urls.filter(u => !u.expiresAt || new Date(u.expiresAt) > new Date()).length;
  const expiredLinks = totalLinks - activeLinks;

  const topPerformingUrls = [...urls]
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 5);

  const filterUrlsForTable = urls.filter(u => 
    u.longUrl.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Charts
  const getChartData = () => {
    if (!selectedUrl || !selectedUrl.visitHistory || selectedUrl.visitHistory.length === 0) {
      return {
        labels: ["No clicks"],
        datasets: [{
          label: "Clicks Over Time",
          data: [0],
          borderColor: "#00f0ff",
          backgroundColor: "rgba(0, 240, 255, 0.1)",
          tension: 0.4
        }]
      };
    }

    const dates = {};
    // Last 7 days with clicks
    selectedUrl.visitHistory.forEach(v => {
      const dateStr = new Date(v.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      dates[dateStr] = (dates[dateStr] || 0) + 1;
    });

    const labels = Object.keys(dates).slice(-7);
    const data = labels.map(l => dates[l]);

    return {
      labels,
      datasets: [
        {
          label: "Clicks",
          data,
          borderColor: "#00f0ff",
          backgroundColor: "rgba(0, 240, 255, 0.08)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: "#00f0ff",
          pointBorderColor: "#fff",
          pointRadius: 4
        }
      ]
    };
  };

  const getBrowserChartData = () => {
    if (!selectedUrl || !selectedUrl.visitHistory || selectedUrl.visitHistory.length === 0) {
      return null;
    }

    const browsers = {};
    selectedUrl.visitHistory.forEach(v => {
      const name = v.browser || "Unknown";
      browsers[name] = (browsers[name] || 0) + 1;
    });

    return {
      labels: Object.keys(browsers),
      datasets: [{
        data: Object.values(browsers),
        backgroundColor: ["#00f0ff", "#ff007f", "#10b981", "#f59e0b", "#8b5cf6"],
        borderWidth: 0
      }]
    };
  };

  const getDeviceChartData = () => {
    if (!selectedUrl || !selectedUrl.visitHistory || selectedUrl.visitHistory.length === 0) {
      return null;
    }

    const devices = {};
    selectedUrl.visitHistory.forEach(v => {
      const name = v.device || "Desktop";
      devices[name] = (devices[name] || 0) + 1;
    });

    return {
      labels: Object.keys(devices),
      datasets: [{
        data: Object.values(devices),
        backgroundColor: ["#00f0ff", "#ff007f", "#f59e0b"],
        borderWidth: 0
      }]
    };
  };

  const getGeoBreakdown = () => {
    if (!selectedUrl || !selectedUrl.visitHistory) return { sortedCountries: [], sortedCities: [] };

    const countries = {};
    const cities = {};

    selectedUrl.visitHistory.forEach(v => {
      const country = v.country || "Unknown";
      const city = v.city || "Unknown";
      countries[country] = (countries[country] || 0) + 1;
      cities[city] = (cities[city] || 0) + 1;
    });

    const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sortedCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { sortedCountries, sortedCities };
  };

  // Navigated Page Renders
  const renderOverview = () => (
    <>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
      </div>
      <p className="page-description">Overview of link metrics and overall shortened link statistics.</p>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Links</div>
          <div className="stat-val">{totalLinks}</div>
        </div>
        <div className="stat-card magenta">
          <div className="stat-label">Total Clicks</div>
          <div className="stat-val">{totalClicks}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Active Links</div>
          <div className="stat-val">{activeLinks}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Expired Links</div>
          <div className="stat-val">{expiredLinks}</div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginTop: "15px" }}>
        <div className="glass-panel">
          <h3 className="panel-title"><FiBarChart2 /> Top Performing Links</h3>
          {topPerformingUrls.length === 0 ? (
            <p className="placeholder-text">No shortened URLs yet.</p>
          ) : (
            <div>
              {topPerformingUrls.map((url) => (
                <div key={url._id} className="recent-list-row">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ color: "var(--cyan)", fontWeight: "bold" }}>/{url.shortCode}</span>
                    <span className="url-truncated" style={{ maxWidth: "250px", fontSize: "11px" }}>{url.longUrl}</span>
                  </div>
                  <span className="badge badge-clicks">{url.clickCount} clicks</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel">
          <h3 className="panel-title"><FiActivity /> Recent Activity</h3>
          {urls.length === 0 ? (
            <p className="placeholder-text">No clicks recorded yet.</p>
          ) : (
            <div>
              {[...urls]
                .filter(u => u.lastVisited)
                .sort((a,b) => new Date(b.lastVisited) - new Date(a.lastVisited))
                .slice(0, 5)
                .map((url) => (
                  <div key={url._id} className="recent-list-row">
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span style={{ color: "#fff", fontWeight: "bold" }}>/{url.shortCode}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Last visit: {new Date(url.lastVisited).toLocaleString()}</span>
                    </div>
                    <button 
                      className="cyber-btn" 
                      style={{ padding: "6px 12px", fontSize: "11px", width: "auto" }}
                      onClick={() => {
                        setSelectedUrl(url);
                        setCurrentPage("analytics");
                      }}
                    >
                      Analyze
                    </button>
                  </div>
                ))}
              {urls.filter(u => u.lastVisited).length === 0 && (
                <p className="placeholder-text">Waiting for first link clicks...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderShorten = () => (
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

          <button type="submit" className="cyber-btn" disabled={loading}>
            {loading ? "Creating..." : "Shorten URL"}
          </button>
        </form>
      </div>

      {lastShortened && (
        <div className="glass-panel success-panel">
          <h3 className="success-title"><FiCheck /> Short Link Created Successfully!</h3>
          <div className="success-box">
            <a 
              href={`http://localhost:5000/${lastShortened.shortCode}`}
              target="_blank"
              rel="noreferrer"
              className="success-link"
            >
              http://localhost:5000/{lastShortened.shortCode}
            </a>
            <div className="success-actions">
              <button 
                className="action-btn copy-btn"
                onClick={() => handleCopyLink(lastShortened.shortCode, "last")}
                title="Copy Link"
              >
                <FiCopy />
              </button>
              <button 
                className="action-btn view-btn"
                onClick={() => {
                  setSelectedUrl(lastShortened);
                  setCurrentPage("analytics");
                }}
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

  const renderLinks = () => (
    <>
      <div className="page-header">
        <h1>My Short URLs</h1>
      </div>
      <p className="page-description">Manage and search your generated shortened links.</p>

      <div className="glass-panel">
        <div className="links-control-row">
          <div className="search-bar">
            <input 
              type="text" 
              className="cyber-input" 
              placeholder="Search links by code or destination..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="cyber-btn" style={{ padding: "10px 20px" }} onClick={() => setCurrentPage("shorten")}>
            <FiPlus /> New URL
          </button>
        </div>

        <div className="table-container">
          {filterUrlsForTable.length === 0 ? (
            <p className="placeholder-text">No links found matching your query.</p>
          ) : (
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Original URL</th>
                  <th>Short Link</th>
                  <th>Clicks</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterUrlsForTable.map((url) => {
                  const isExpired = url.expiresAt && new Date(url.expiresAt) < new Date();
                  return (
                    <tr key={url._id}>
                      <td className="url-col">
                        <div className="url-truncated" title={url.longUrl}>
                          {url.longUrl}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                          Created: {new Date(url.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <a 
                          href={`http://localhost:5000/${url.shortCode}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="short-link"
                        >
                          /{url.shortCode} <FiExternalLink style={{ fontSize: "11px" }} />
                        </a>
                      </td>
                      <td>
                        <span className="badge badge-clicks">{url.clickCount}</span>
                      </td>
                      <td>
                        {url.expiresAt ? (
                          isExpired ? (
                            <span className="badge badge-expired">Expired</span>
                          ) : (
                            <span className="badge badge-expiry" title={new Date(url.expiresAt).toLocaleString()}>
                              {new Date(url.expiresAt).toLocaleDateString()}
                            </span>
                          )
                        ) : (
                          <span className="badge badge-expiry">Permanent</span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button 
                            className="action-btn copy-btn"
                            onClick={() => handleCopyLink(url.shortCode, url._id)}
                            title="Copy short code link"
                          >
                            <FiCopy />
                          </button>
                          <button 
                            className="action-btn view-btn"
                            onClick={() => {
                              setSelectedUrl(url);
                              setCurrentPage("analytics");
                            }}
                            title="View detailed performance insights"
                          >
                            <FiBarChart2 />
                          </button>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(url)}
                            title="Edit destination link URL"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(url._id)}
                            title="Delete link permanent"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );

  const renderAnalytics = () => {
    const { sortedCountries, sortedCities } = getGeoBreakdown();
    
    return (
      <>
        <div className="page-header">
          <h1>Link Analytics Center</h1>
        </div>
        <p className="page-description">Detailed performance charts, QR codes, geolocation logs, and device distributions.</p>

        <div className="analytics-selector-row">
          <div className="select-group">
            <span style={{ fontSize: "14px", fontWeight: "600", textTransform: "uppercase", color: "var(--text-muted)" }}>Select URL:</span>
            <select 
              className="cyber-select" 
              value={selectedUrl ? selectedUrl._id : ""} 
              onChange={(e) => {
                const found = urls.find(u => u._id === e.target.value);
                if (found) setSelectedUrl(found);
              }}
            >
              {urls.length === 0 ? (
                <option value="">No URLs Available</option>
              ) : (
                urls.map(u => (
                  <option key={u._id} value={u._id}>
                    /{u.shortCode} - {u.longUrl.substring(0, 30)}...
                  </option>
                ))
              )}
            </select>
          </div>
          {selectedUrl && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                className="cyber-btn" 
                style={{ padding: "8px 16px", fontSize: "12px", width: "auto" }}
                onClick={() => handleCopyLink(selectedUrl.shortCode, "anal")}
              >
                Copy Link
              </button>
              <button 
                className="cyber-btn" 
                style={{ padding: "8px 16px", fontSize: "12px", width: "auto", background: "rgba(0,0,0,0.5)", border: "1px solid var(--cyan)", color: "#fff" }}
                onClick={() => handleShareLink(selectedUrl.shortCode)}
              >
                <FiShare2 /> Share
              </button>
            </div>
          )}
        </div>

        {selectedUrl ? (
          <div className="analytics-layout">
            
            {/* Click summary cards */}
            <div className="glass-panel">
              <h3 className="panel-title"><FiActivity /> Performance Summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Clicks</div>
                  <div style={{ fontSize: "28px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "var(--cyan)" }}>
                    {selectedUrl.clickCount}
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Last Visited</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "15px" }}>
                    {selectedUrl.lastVisited ? new Date(selectedUrl.lastVisited).toLocaleString() : "Never"}
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Created Date</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "15px" }}>
                    {new Date(selectedUrl.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "18px", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", marginTop: "15px", color: (selectedUrl.expiresAt && new Date(selectedUrl.expiresAt) < new Date()) ? "#ff007f" : "#10b981" }}>
                    {selectedUrl.expiresAt && new Date(selectedUrl.expiresAt) < new Date() ? "Expired" : "Active"}
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="glass-panel">
              <h3 className="panel-title"><FiShare2 /> QR Code Sharing</h3>
              <div className="qr-card-content">
                <div className="qr-canvas-container">
                  <QRCodeCanvas 
                    value={`http://localhost:5000/${selectedUrl.shortCode}`} 
                    size={140}
                    id={`qr-${selectedUrl.shortCode}`}
                    level={"H"}
                  />
                </div>
                <button 
                  className="cyber-btn" 
                  style={{ padding: "8px 16px", fontSize: "12px", width: "auto" }}
                  onClick={() => downloadQRCode(selectedUrl.shortCode)}
                >
                  Download QR Code
                </button>
              </div>
            </div>

            {/* 7 Days click chart */}
            <div className="glass-panel analytics-panel-full">
              <h3 className="panel-title"><FiBarChart2 /> Click Trend (Last 7 Days)</h3>
              <div className="chart-container-large">
                <Line 
                  data={getChartData()} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      y: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#9ca3af", font: { family: "Inter", size: 10 } }
                      },
                      x: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#9ca3af", font: { family: "Inter", size: 10 } }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Browser & Device Charts */}
            {selectedUrl.visitHistory && selectedUrl.visitHistory.length > 0 && (
              <>
                <div className="glass-panel">
                  <h3 className="panel-title"><FiLayers /> Browser Distribution</h3>
                  {getBrowserChartData() ? (
                    <div className="chart-container-doughnut">
                      <Doughnut 
                        data={getBrowserChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "right", labels: { color: "#9ca3af", font: { size: 10 } } } }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="placeholder-text">No logs available</p>
                  )}
                </div>

                <div className="glass-panel">
                  <h3 className="panel-title"><FiGrid /> Device Distribution</h3>
                  {getDeviceChartData() ? (
                    <div className="chart-container-doughnut">
                      <Doughnut 
                        data={getDeviceChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { position: "right", labels: { color: "#9ca3af", font: { size: 10 } } } }
                        }}
                      />
                    </div>
                  ) : (
                    <p className="placeholder-text">No logs available</p>
                  )}
                </div>
              </>
            )}

            {/* Geolocation Breakdowns */}
            {selectedUrl.visitHistory && selectedUrl.visitHistory.length > 0 && (
              <>
                <div className="glass-panel">
                  <h3 className="panel-title"><FiGlobe /> Top Countries</h3>
                  <table className="geo-table">
                    <tbody>
                      {sortedCountries.length === 0 ? (
                        <tr><td className="placeholder-text">No locations logged.</td></tr>
                      ) : (
                        sortedCountries.map(([country, count]) => (
                          <tr key={country}>
                            <td>📍 {country}</td>
                            <td className="geo-count">{count} clicks</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="glass-panel">
                  <h3 className="panel-title"><FiGlobe /> Top Cities</h3>
                  <table className="geo-table">
                    <tbody>
                      {sortedCities.length === 0 ? (
                        <tr><td className="placeholder-text">No locations logged.</td></tr>
                      ) : (
                        sortedCities.map(([city, count]) => (
                          <tr key={city}>
                            <td>🏙️ {city}</td>
                            <td className="geo-count">{count} clicks</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Detailed Visit Logs */}
            <div className="glass-panel analytics-panel-full">
              <h3 className="panel-title"><FiClock /> Detailed Visitor Log</h3>
              {(!selectedUrl.visitHistory || selectedUrl.visitHistory.length === 0) ? (
                <p className="placeholder-text">No visits logged for this link yet.</p>
              ) : (
                <div className="visits-log-list">
                  {selectedUrl.visitHistory.slice().reverse().map((visit, index) => (
                    <div className="visit-log-item" key={index}>
                      <div className="visit-log-details">
                        <div className="visit-log-time">{new Date(visit.timestamp).toLocaleString()}</div>
                        <div className="visit-log-specs">
                          System: <span>{visit.browser}</span> on <span>{visit.device}</span>
                        </div>
                      </div>
                      <div className="visit-log-right">
                        <div className="visit-log-ip">{visit.ip}</div>
                        <div className="visit-log-geo">
                          🌍 {visit.city && visit.city !== "Unknown" ? `${visit.city}, ` : ""}{visit.country}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <p className="placeholder-text">Shorten a URL first to enable performance tracking.</p>
        )}
      </>
    );
  };

  const renderBulk = () => (
    <>
      <div className="page-header">
        <h1>Bulk Import URLs</h1>
      </div>
      <p className="page-description">Upload formatted CSV or TXT text files to shorten dozens of links instantly.</p>

      <div className="bulk-container">
        <div className="glass-panel">
          <h2 className="panel-title"><FiLayers /> CSV Batch Loader</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Select a `.csv` or `.txt` file containing a clean list of target URLs. We will parse it on-the-fly and prepare them for batch shortening.
          </p>

          <label className="csv-drag-zone">
            <FiUploadCloud className="csv-icon" />
            <span style={{ fontSize: "16px", fontWeight: "600" }}>Upload URLs List File</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Supports raw CSV and txt files with full HTTP/HTTPS paths</span>
            <input 
              type="file" 
              accept=".csv,.txt" 
              style={{ display: "none" }} 
              onChange={handleCSVUpload}
            />
          </label>

          {bulkUrls.length > 0 && (
            <div className="bulk-preview">
              <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "10px" }}>
                Ready to Shorten ({bulkUrls.length} URLs parsed)
              </h3>
              <div className="bulk-preview-list">
                {bulkUrls.map((url, idx) => (
                  <div key={idx} className="bulk-preview-item">
                    {idx + 1}. {url}
                  </div>
                ))}
              </div>

              {bulkProgress > 0 && (
                <div style={{ margin: "15px 0" }}>
                  <div className="bulk-progress-bar-container">
                    <div className="bulk-progress-bar" style={{ width: `${bulkProgress}%` }}></div>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--cyan)" }}>Shortening batch in progress...</span>
                </div>
              )}

              <button className="cyber-btn" onClick={handleProcessBulk} style={{ width: "100%" }}>
                Shorten in Bulk
              </button>
            </div>
          )}

          {bulkSuccessLog.length > 0 && (
            <div style={{ marginTop: "40px" }}>
              <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "var(--green)", marginBottom: "15px" }}>
                Bulk Success Log
              </h3>
              <div className="table-container">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Original Destination</th>
                      <th>Shortened Link</th>
                      <th>Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkSuccessLog.map((url, idx) => (
                      <tr key={url._id || idx}>
                        <td className="url-col"><div className="url-truncated">{url.longUrl}</div></td>
                        <td>
                          <a 
                            href={`http://localhost:5000/${url.shortCode}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="short-link"
                          >
                            /{url.shortCode}
                          </a>
                        </td>
                        <td>
                          <button 
                            className="action-btn copy-btn"
                            style={{ width: "30px", height: "30px", fontSize: "12px" }}
                            onClick={() => handleCopyLink(url.shortCode, `bulk-${idx}`)}
                          >
                            {copiedId === `bulk-${idx}` ? <FiCheck /> : <FiCopy />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="dashboard-container">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <FiActivity style={{ color: "var(--cyan)" }} /> NEXUS
          </div>
          <nav className="sidebar-menu">
            <div 
              className={`sidebar-item ${currentPage === "overview" ? "active" : ""}`}
              onClick={() => setCurrentPage("overview")}
            >
              <FiGrid className="sidebar-item-icon" /> Dashboard Overview
            </div>
            <div 
              className={`sidebar-item ${currentPage === "shorten" ? "active" : ""}`}
              onClick={() => setCurrentPage("shorten")}
            >
              <FiPlus className="sidebar-item-icon" /> Shorten URL
            </div>
            <div 
              className={`sidebar-item ${currentPage === "links" ? "active" : ""}`}
              onClick={() => setCurrentPage("links")}
            >
              <FiLink className="sidebar-item-icon" /> My URLs
            </div>
            <div 
              className={`sidebar-item ${currentPage === "analytics" ? "active" : ""}`}
              onClick={() => setCurrentPage("analytics")}
            >
              <FiBarChart2 className="sidebar-item-icon" /> Detailed Analytics
            </div>
            <div 
              className={`sidebar-item ${currentPage === "bulk" ? "active" : ""}`}
              onClick={() => setCurrentPage("bulk")}
            >
              <FiLayers className="sidebar-item-icon" /> Bulk Import
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-label">Logged In</span>
            <span className="sidebar-user-email" title={userEmail}>{userEmail}</span>
          </div>
          <div 
            className="sidebar-item" 
            style={{ color: "var(--magenta)", border: "1px solid rgba(255, 0, 127, 0.15)" }} 
            onClick={handleLogout}
          >
            <FiLogOut className="sidebar-item-icon" /> Logout
          </div>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT */}
      <main className="main-content">
        {currentPage === "overview" && renderOverview()}
        {currentPage === "shorten" && renderShorten()}
        {currentPage === "links" && renderLinks()}
        {currentPage === "analytics" && renderAnalytics()}
        {currentPage === "bulk" && renderBulk()}
      </main>

      {/* EDIT TARGET DESTINATION URL MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-header">Edit Destination URL</h3>
            <div className="input-group">
              <label className="input-label">New Destination URL Path</label>
              <input 
                type="text" 
                className="cyber-input" 
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="https://example.com/new-path"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button className="modal-btn save" onClick={handleUpdateUrl}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import { 
  FiLink, FiActivity, FiGlobe, FiLayers, FiGrid, FiExternalLink, FiCopy, FiCheck, FiArrowLeft
} from "react-icons/fi";
import toast from "react-hot-toast";
import "./Dashboard.css";

export default function PublicStats() {
  const { shortCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("daily"); // "daily", "weekly", "monthly"

  useEffect(() => {
    fetchPublicStats();
  }, [shortCode]);

  const fetchPublicStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5000/api/public/stats/${shortCode}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Error loading statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const link = `http://localhost:5000/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Short link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="main-content" style={{ marginLeft: 0, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="placeholder-text">Loading link stats...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="main-content" style={{ marginLeft: 0, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "64px", marginBottom: "20px" }}>⚠️</div>
          <h2 style={{ color: "var(--cyan)", fontFamily: "Orbitron" }}>Stats Not Available</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "10px", marginBottom: "30px" }}>The requested short link stats could not be found or has expired.</p>
          <Link to="/" className="cyber-btn" style={{ padding: "10px 20px", textDecoration: "none", fontSize: "14px" }}>Go to Portal</Link>
        </div>
      </div>
    );
  }

  // Calculate distinct IP visitors
  const uniqueVisitors = data.visitHistory 
    ? new Set(data.visitHistory.map(v => v.ip)).size 
    : 0;

  // Calculate average clicks per day
  const elapsedDays = data.createdAt 
    ? Math.max(1, Math.ceil((new Date() - new Date(data.createdAt)) / (1000 * 60 * 60 * 24)))
    : 1;
  const avgClicksPerDay = (data.clickCount / elapsedDays).toFixed(1);

  // Group click history for charts
  const getChartData = () => {
    if (!data.visitHistory || data.visitHistory.length === 0) {
      return [{ name: "No Data", clicks: 0 }];
    }

    const groups = {};
    data.visitHistory.forEach(v => {
      const d = new Date(v.timestamp);
      let key = "";
      if (chartPeriod === "daily") {
        key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } else if (chartPeriod === "weekly") {
        // Group by calendar week (e.g. "W22")
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d - startOfYear) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        key = `Week ${weekNum}`;
      } else {
        // Group by month (e.g. "Jun 2026")
        key = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      }
      groups[key] = (groups[key] || 0) + 1;
    });

    // Convert to sorted Array
    return Object.entries(groups).map(([name, clicks]) => ({ name, clicks }));
  };

  const chartData = getChartData();

  // Geography stats
  const getGeoStats = () => {
    const countries = {};
    const cities = {};
    if (data.visitHistory) {
      data.visitHistory.forEach(v => {
        const country = v.country || "Unknown";
        const city = v.city || "Unknown";
        countries[country] = (countries[country] || 0) + 1;
        cities[city] = (cities[city] || 0) + 1;
      });
    }
    const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sortedCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { sortedCountries, sortedCities };
  };

  const { sortedCountries, sortedCities } = getGeoStats();

  // Browser/device specs
  const getDeviceDistribution = () => {
    const devices = {};
    const browsers = {};
    if (data.visitHistory) {
      data.visitHistory.forEach(v => {
        const device = v.device || "Desktop";
        const browser = v.browser || "Unknown";
        devices[device] = (devices[device] || 0) + 1;
        browsers[browser] = (browsers[browser] || 0) + 1;
      });
    }
    return { devices, browsers };
  };

  const { devices, browsers } = getDeviceDistribution();

  return (
    <div className="main-content" style={{ marginLeft: 0, padding: "40px max(20px, 5%)", minHeight: "100vh" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid rgba(0, 240, 255, 0.15)", paddingBottom: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <Link to="/" className="action-btn view-btn" style={{ width: "40px", height: "40px", borderRadius: "10px" }} title="Back to Portal">
            <FiArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={{ fontFamily: "Orbitron", fontSize: "24px", color: "#fff", textShadow: "0 0 10px rgba(0, 240, 255, 0.3)" }}>
              Public Link Stats
            </h1>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Short URL: /{shortCode}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="cyber-btn" style={{ padding: "8px 16px", fontSize: "12px", width: "auto" }} onClick={handleCopy}>
            {copied ? <FiCheck /> : <FiCopy />} {copied ? "Copied!" : "Copy Short URL"}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: "30px" }}>
        <h3 className="panel-title"><FiLink /> Destination Metadata</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Original URL Link</span>
            <div style={{ fontSize: "16px", fontWeight: "bold", wordBreak: "break-all", marginTop: "4px" }}>
              <a href={data.longUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)", textDecoration: "none" }}>
                {data.longUrl} <FiExternalLink size={12} />
              </a>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px", marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Created Date</span>
              <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px" }}>
                {new Date(data.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Status</span>
              <div style={{ fontSize: "14px", fontWeight: "600", marginTop: "4px", color: data.isExpired ? "var(--magenta)" : "var(--green)" }}>
                {data.isExpired ? "Expired / Inactive" : "Active / Live"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="stats-grid" style={{ marginBottom: "30px" }}>
        <div className="stat-card">
          <div className="stat-label">Total Clicks</div>
          <div className="stat-val" style={{ color: "var(--cyan)" }}>{data.clickCount}</div>
        </div>
        <div className="stat-card magenta">
          <div className="stat-label">Unique Visitors</div>
          <div className="stat-val">{uniqueVisitors}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Avg Clicks / Day</div>
          <div className="stat-val">{avgClicksPerDay}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Last Visited Time</div>
          <div className="stat-val" style={{ fontSize: "14px", fontFamily: "Inter", fontWeight: "600", marginTop: "15px" }}>
            {data.lastVisited ? new Date(data.lastVisited).toLocaleString() : "Never"}
          </div>
        </div>
      </section>

      {/* Click Trend Chart */}
      <div className="glass-panel" style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 className="panel-title" style={{ marginBottom: 0 }}><FiActivity /> Clicks Analytics Trend</h3>
          <div className="action-btns" style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "2px", border: "1px solid rgba(255,255,255,0.08)" }}>
            {["daily", "weekly", "monthly"].map(p => (
              <button 
                key={p} 
                className={`action-btn`}
                style={{ 
                  background: chartPeriod === p ? "var(--cyan)" : "transparent",
                  color: chartPeriod === p ? "var(--bg-darker)" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  fontWeight: "bold",
                  height: "28px",
                  width: "auto",
                  padding: "0 12px"
                }}
                onClick={() => setChartPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="chart-container-large">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: "10px" }} />
              <YAxis stroke="var(--text-muted)" style={{ fontSize: "10px" }} />
              <Tooltip 
                contentStyle={{ background: "var(--bg-darker)", border: "1px solid var(--cyan)", borderRadius: "8px", color: "#fff" }} 
                labelStyle={{ fontWeight: "bold" }}
              />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="var(--cyan)" 
                strokeWidth={2} 
                dot={{ fill: "var(--cyan)", r: 4 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Geolocation Breakdowns */}
      <div className="analytics-layout">
        <div className="glass-panel">
          <h3 className="panel-title"><FiGlobe /> Top Countries</h3>
          <table className="geo-table">
            <tbody>
              {sortedCountries.length === 0 ? (
                <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No location stats logged.</td></tr>
              ) : (
                sortedCountries.map(([country, count]) => (
                  <tr key={country}>
                    <td style={{ color: "#fff" }}>📍 {country}</td>
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
                <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No location stats logged.</td></tr>
              ) : (
                sortedCities.map(([city, count]) => (
                  <tr key={city}>
                    <td style={{ color: "#fff" }}>🏙️ {city}</td>
                    <td className="geo-count">{count} clicks</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Browser & Device Distributions */}
        <div className="glass-panel">
          <h3 className="panel-title"><FiLayers /> Browser Distribution</h3>
          <table className="geo-table">
            <tbody>
              {Object.keys(browsers).length === 0 ? (
                <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No stats available.</td></tr>
              ) : (
                Object.entries(browsers).map(([browser, count]) => (
                  <tr key={browser}>
                    <td style={{ color: "#fff" }}>🌐 {browser}</td>
                    <td className="geo-count">{count} clicks</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="glass-panel">
          <h3 className="panel-title"><FiGrid /> Device Distribution</h3>
          <table className="geo-table">
            <tbody>
              {Object.keys(devices).length === 0 ? (
                <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No stats available.</td></tr>
              ) : (
                Object.entries(devices).map(([device, count]) => (
                  <tr key={device}>
                    <td style={{ color: "#fff" }}>💻 {device}</td>
                    <td className="geo-count">{count} clicks</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

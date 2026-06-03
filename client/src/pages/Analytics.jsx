import { useState, useEffect } from "react";
//import { useOutletContext, useSearchParams } from "react-router-dom";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from "recharts";
import { QRCodeCanvas } from "qrcode.react";
import { 
  FiGrid, FiBarChart2, FiLayers, FiGlobe, FiShare2, FiActivity, FiClock, FiExternalLink, FiSearch, FiCopy, FiCheck, FiArrowLeft, FiArrowRight
} from "react-icons/fi";
import { 
  FaWhatsapp, FaTelegramPlane, FaEnvelope, FaShareAlt, FaCopy, FaDownload 
} from "react-icons/fa";
import toast from "react-hot-toast";
import "./Dashboard.css";

export default function Analytics() {
  const { urls, loading } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [selectedUrl, setSelectedUrl] = useState(null);

  // General share state
  const [copied, setCopied] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("daily"); // "daily", "weekly", "monthly"

  // Visitor Log table state variables
  const [logSearch, setLogSearch] = useState("");
  const [browserFilter, setBrowserFilter] = useState("All");
  const [deviceFilter, setDeviceFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  const [logSort, setLogSort] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    if (urls.length > 0) {
      const urlId = searchParams.get("id");
      if (urlId) {
        const found = urls.find(u => u._id === urlId);
        if (found) {
          setSelectedUrl(found);
          return;
        }
      }
      
      if (!selectedUrl) {
        setSelectedUrl(urls[0]);
      } else {
        const updated = urls.find(u => u._id === selectedUrl._id);
        if (updated) setSelectedUrl(updated);
      }
    }
  }, [urls, searchParams, selectedUrl]);

  // Reset pagination when selected url changes
  useEffect(() => {
    setCurrentPage(1);
    setLogSearch("");
    setBrowserFilter("All");
    setDeviceFilter("All");
    setCountryFilter("All");
  }, [selectedUrl]);

  const handleCopyLink = (shortCode) => {
    const link = `http://localhost:5000/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Copied short URL to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQRCode = (code) => {
    const canvas = document.getElementById(`qr-${code}`);
    if (!canvas) return toast.error("QR Code not found");
    const pngFile = canvas.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `qr_${code}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
    toast.success("QR Code downloaded!");
  };

  const copyQRImage = (code) => {
    const canvas = document.getElementById(`qr-${code}`);
    if (!canvas) return toast.error("QR Code not found");
    canvas.toBlob(async (blob) => {
      if (!blob) return toast.error("Failed to generate image blob");
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        toast.success("QR Code image copied!");
      } catch (err) {
        toast.error("Clipboard copy blocked by browser");
      }
    });
  };

  const shareNative = async (code) => {
    const link = `http://localhost:5000/${code}`;
    const canvas = document.getElementById(`qr-${code}`);
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `qr_${code}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: "QR Code Link",
            text: `Scan QR code for /${code}`,
            url: link
          });
        } catch (err) {
          console.error(err);
        }
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: "Shortened Link",
            text: "Check out this link!",
            url: link
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        navigator.clipboard.writeText(link);
        toast.success("Short link copied to clipboard!");
      }
    });
  };

  // IP masking logic
  const maskIp = (ip) => {
    if (!ip || ip === "Unknown") return "Unknown";
    if (ip.includes(".")) {
      const parts = ip.split(".");
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
      }
    } else if (ip.includes(":")) {
      const parts = ip.split(":");
      if (parts.length > 2) {
        return `${parts[0]}:${parts[1]}:****:****:****:****`;
      }
    }
    return ip;
  };

  // Recharts Click Trend Line Chart Data
  const getChartData = () => {
    if (!selectedUrl || !selectedUrl.visitHistory || selectedUrl.visitHistory.length === 0) {
      return [{ name: "No Clicks", clicks: 0 }];
    }

    const groups = {};
    selectedUrl.visitHistory.forEach(v => {
      const d = new Date(v.timestamp);
      let key = "";
      if (chartPeriod === "daily") {
        key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } else if (chartPeriod === "weekly") {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDays = (d - startOfYear) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        key = `Week ${weekNum}`;
      } else {
        key = d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      }
      groups[key] = (groups[key] || 0) + 1;
    });

    return Object.entries(groups).map(([name, clicks]) => ({ name, clicks }));
  };

  const chartData = getChartData();

  // Metrics summary calculations
  const uniqueVisitors = selectedUrl && selectedUrl.visitHistory 
    ? new Set(selectedUrl.visitHistory.map(v => v.ip)).size 
    : 0;

  const elapsedDays = selectedUrl && selectedUrl.createdAt
    ? Math.max(1, Math.ceil((new Date() - new Date(selectedUrl.createdAt)) / (1000 * 60 * 60 * 24)))
    : 1;

  const avgClicksPerDay = selectedUrl 
    ? (selectedUrl.clickCount / elapsedDays).toFixed(1)
    : "0.0";

  // Geography breakdowns
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

  const { sortedCountries, sortedCities } = getGeoBreakdown();

  // Browser/Device distributions
  const getSpecsDistribution = () => {
    const devices = {};
    const browsers = {};
    if (selectedUrl && selectedUrl.visitHistory) {
      selectedUrl.visitHistory.forEach(v => {
        const dName = v.device || "Desktop";
        const bName = v.browser || "Unknown";
        devices[dName] = (devices[dName] || 0) + 1;
        browsers[bName] = (browsers[bName] || 0) + 1;
      });
    }
    return { devices, browsers };
  };

  const { devices, browsers } = getSpecsDistribution();

  // Visitor log filtration, search, and sorting
  const getFilteredLogs = () => {
    if (!selectedUrl || !selectedUrl.visitHistory) return [];
    
    let logs = [...selectedUrl.visitHistory];

    if (browserFilter !== "All") {
      logs = logs.filter(l => (l.browser || "Unknown") === browserFilter);
    }

    if (deviceFilter !== "All") {
      logs = logs.filter(l => (l.device || "Desktop") === deviceFilter);
    }

    if (countryFilter !== "All") {
      logs = logs.filter(l => (l.country || "Unknown") === countryFilter);
    }

    if (logSearch.trim()) {
      const search = logSearch.toLowerCase().trim();
      logs = logs.filter(l => 
        (l.ip && maskIp(l.ip).toLowerCase().includes(search)) ||
        (l.country && l.country.toLowerCase().includes(search)) ||
        (l.browser && l.browser.toLowerCase().includes(search)) ||
        (l.device && l.device.toLowerCase().includes(search)) ||
        (l.referrer && l.referrer.toLowerCase().includes(search)) ||
        new Date(l.timestamp).toLocaleString().toLowerCase().includes(search)
      );
    }

    if (logSort === "latest") {
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else {
      logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    return logs;
  };

  const filteredLogs = getFilteredLogs();

  // Filter lists options
  const getUniqueFilters = () => {
    const browsersSet = new Set();
    const countriesSet = new Set();
    if (selectedUrl && selectedUrl.visitHistory) {
      selectedUrl.visitHistory.forEach(v => {
        if (v.browser) browsersSet.add(v.browser);
        if (v.country) countriesSet.add(v.country);
      });
    }
    return {
      uniqueBrowsers: ["All", ...Array.from(browsersSet)],
      uniqueCountries: ["All", ...Array.from(countriesSet)]
    };
  };

  const { uniqueBrowsers, uniqueCountries } = getUniqueFilters();

  // Paginated visitor logs
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  if (loading) {
    return <div className="placeholder-text">Loading analytics dashboard...</div>;
  }

  if (urls.length === 0) {
    return (
      <>
        <div className="page-header">
          <h1>Link Analytics Center</h1>
        </div>
        <div className="glass-panel" style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "50px", marginBottom: "15px" }}>📊</div>
          <h3 style={{ color: "var(--cyan)", fontFamily: "Orbitron" }}>No Performance Data</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "8px" }}>Shorten a URL first to enable performance and click tracking metrics.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Link Analytics Center</h1>
      </div>
      <p className="page-description">Detailed performance charts, QR codes, geolocation logs, and device distributions.</p>

      {/* Select URL Selector */}
      <div className="analytics-selector-row" style={{ marginTop: "20px" }}>
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
            {urls.map(u => (
              <option key={u._id} value={u._id}>
                /{u.shortCode} - {u.longUrl.substring(0, 45)}...
              </option>
            ))}
          </select>
        </div>
        {selectedUrl && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              className="cyber-btn" 
              style={{ padding: "8px 16px", fontSize: "12px", width: "auto" }}
              onClick={() => handleCopyLink(selectedUrl.shortCode)}
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <Link 
              to={`/stats/${selectedUrl.shortCode}`} 
              className="cyber-btn"
              style={{ padding: "8px 16px", fontSize: "12px", width: "auto", background: "rgba(0,0,0,0.5)", border: "1px solid var(--cyan)", color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <FiExternalLink /> Public Page
            </Link>
          </div>
        )}
      </div>

      {selectedUrl && (
        <div className="analytics-layout" style={{ marginTop: "25px" }}>
          
          {/* Overview cards */}
          <div className="glass-panel">
            <h3 className="panel-title"><FiActivity /> Performance Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", borderLeft: "3px solid var(--cyan)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Clicks</div>
                <div style={{ fontSize: "26px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "var(--cyan)" }}>
                  {selectedUrl.clickCount}
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", borderLeft: "3px solid var(--magenta)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Unique Visitors</div>
                <div style={{ fontSize: "26px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "var(--magenta)" }}>
                  {uniqueVisitors}
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", borderLeft: "3px solid var(--green)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Clicks / Day</div>
                <div style={{ fontSize: "26px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "var(--green)" }}>
                  {avgClicksPerDay}
                </div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", borderLeft: "3px solid var(--orange)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Last Visited</div>
                <div style={{ fontSize: "12px", fontWeight: "600", marginTop: "12px", color: "#fff" }}>
                  {selectedUrl.lastVisited ? new Date(selectedUrl.lastVisited).toLocaleString() : "Never"}
                </div>
              </div>
            </div>
            <div style={{ marginTop: "20px", fontSize: "12px", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "15px" }}>
              <span style={{ color: "var(--text-muted)" }}>Target URL: </span>
              <a href={selectedUrl.longUrl} target="_blank" rel="noreferrer" style={{ color: "var(--cyan)", wordBreak: "break-all", textDecoration: "none" }}>
                {selectedUrl.longUrl} <FiExternalLink style={{ fontSize: "10px" }} />
              </a>
            </div>
          </div>

          {/* QR Code Canvas panel */}
          <div className="glass-panel">
            <h3 className="panel-title"><FiShare2 /> QR Code Panel</h3>
            <div className="qr-card-content">
              <div className="qr-canvas-container" style={{ background: "#fff", padding: "10px", borderRadius: "10px", display: "inline-flex" }}>
                <QRCodeCanvas 
                  value={`http://localhost:5000/${selectedUrl.shortCode}`} 
                  size={120}
                  id={`qr-${selectedUrl.shortCode}`}
                  level={"H"}
                />
              </div>
              <div style={{ display: "flex", gap: "10px", width: "100%", justifyContent: "center" }}>
                <button 
                  className="cyber-btn" 
                  style={{ padding: "8px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", width: "auto" }}
                  onClick={() => downloadQRCode(selectedUrl.shortCode)}
                >
                  <FaDownload /> Download
                </button>
                <button 
                  className="cyber-btn" 
                  style={{ padding: "8px 12px", fontSize: "11px", display: "flex", alignItems: "center", gap: "5px", width: "auto", background: "rgba(0,0,0,0.5)", border: "1px solid var(--cyan)", color: "#fff" }}
                  onClick={() => copyQRImage(selectedUrl.shortCode)}
                >
                  <FaCopy /> Copy Image
                </button>
              </div>
              
              <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                <button className="action-btn" title="Share WhatsApp" style={{ background: "#25D366", color: "#fff", border: "none" }} onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("http://localhost:5000/" + selectedUrl.shortCode)}`, "_blank")}>
                  <FaWhatsapp />
                </button>
                <button className="action-btn" title="Share Telegram" style={{ background: "#0088cc", color: "#fff", border: "none" }} onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent("http://localhost:5000/" + selectedUrl.shortCode)}`, "_blank")}>
                  <FaTelegramPlane />
                </button>
                <button className="action-btn" title="Share Email" style={{ background: "#ea4335", color: "#fff", border: "none" }} onClick={() => window.open(`mailto:?subject=Shortened%20Link&body=Check%20out%20this%20link:%20http://localhost:5000/${selectedUrl.shortCode}`, "_blank")}>
                  <FaEnvelope />
                </button>
                <button className="action-btn" title="Native System Share" style={{ background: "var(--cyan)", color: "var(--bg-darker)", border: "none" }} onClick={() => shareNative(selectedUrl.shortCode)}>
                  <FaShareAlt />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Line Chart using Recharts */}
          <div className="glass-panel analytics-panel-full">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 className="panel-title" style={{ marginBottom: 0 }}><FiBarChart2 /> Click Analytics Trend</h3>
              <div className="action-btns" style={{ background: "rgba(0,0,0,0.4)", borderRadius: "8px", padding: "2px", border: "1px solid rgba(255,255,255,0.08)" }}>
                {["daily", "weekly", "monthly"].map(p => (
                  <button 
                    key={p} 
                    className="action-btn"
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

          {/* Browser & Device Distributions */}
          <div className="glass-panel">
            <h3 className="panel-title"><FiLayers /> Browser Distribution</h3>
            <table className="geo-table">
              <tbody>
                {Object.keys(browsers).length === 0 ? (
                  <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No browser logs available</td></tr>
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
                  <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No device logs available</td></tr>
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

          {/* Geolocation breakdowns */}
          <div className="glass-panel">
            <h3 className="panel-title"><FiGlobe /> Top Countries</h3>
            <table className="geo-table">
              <tbody>
                {sortedCountries.length === 0 ? (
                  <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No location logs available</td></tr>
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
                  <tr><td className="placeholder-text" style={{ padding: "20px 0" }}>No location logs available</td></tr>
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

          {/* Advanced visitor log table with sorting, search, filtering, and pagination */}
          <div className="glass-panel analytics-panel-full">
            <h3 className="panel-title"><FiClock /> Detailed Visitor Logs</h3>
            
            {/* Control Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "15px", marginBottom: "20px" }}>
              
              {/* Search */}
              <div className="input-group">
                <label className="input-label" style={{ fontSize: "10px" }}>Search logs</label>
                <div style={{ position: "relative" }}>
                  <FiSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input 
                    type="text" 
                    className="cyber-input" 
                    style={{ paddingLeft: "36px", fontSize: "13px" }}
                    placeholder="Search Referrer, IP, Geo..."
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </div>

              {/* Browser Filter */}
              <div className="input-group">
                <label className="input-label" style={{ fontSize: "10px" }}>Browser</label>
                <select 
                  className="cyber-input" 
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "13px" }}
                  value={browserFilter}
                  onChange={(e) => { setBrowserFilter(e.target.value); setCurrentPage(1); }}
                >
                  {uniqueBrowsers.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Device Filter */}
              <div className="input-group">
                <label className="input-label" style={{ fontSize: "10px" }}>Device</label>
                <select 
                  className="cyber-input" 
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "13px" }}
                  value={deviceFilter}
                  onChange={(e) => { setDeviceFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="All">All</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                </select>
              </div>

              {/* Country Filter */}
              <div className="input-group">
                <label className="input-label" style={{ fontSize: "10px" }}>Country</label>
                <select 
                  className="cyber-input" 
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "13px" }}
                  value={countryFilter}
                  onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }}
                >
                  {uniqueCountries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="input-group">
                <label className="input-label" style={{ fontSize: "10px" }}>Sort By Date</label>
                <select 
                  className="cyber-input" 
                  style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "13px" }}
                  value={logSort}
                  onChange={(e) => setLogSort(e.target.value)}
                >
                  <option value="latest">Latest Visit First</option>
                  <option value="oldest">Oldest Visit First</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              {filteredLogs.length === 0 ? (
                <div className="placeholder-text" style={{ padding: "40px 0" }}>No matching visitor logs found.</div>
              ) : (
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Country</th>
                      <th>Device</th>
                      <th>Browser</th>
                      <th>Referrer</th>
                      <th>IP (Masked)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((visit, index) => (
                      <tr key={index}>
                        <td style={{ color: "#fff", fontWeight: "500" }}>{new Date(visit.timestamp).toLocaleString()}</td>
                        <td>🌍 {visit.country} {visit.city && visit.city !== "Unknown" ? `(${visit.city})` : ""}</td>
                        <td>💻 {visit.device}</td>
                        <td>🌐 {visit.browser}</td>
                        <td style={{ color: "var(--cyan)", fontWeight: "500" }}>{visit.referrer || "Direct"}</td>
                        <td style={{ fontFamily: "Share Tech Mono, monospace" }}>{maskIp(visit.ip)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredLogs.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} logs
                </span>
                
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Rows per page:</span>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", borderRadius: "5px", padding: "4px 8px", fontSize: "12px" }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>

                  <div style={{ display: "flex", gap: "5px" }}>
                    <button 
                      className="action-btn copy-btn"
                      style={{ width: "32px", height: "32px", opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <FiArrowLeft />
                    </button>
                    <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontSize: "13px", fontWeight: "bold" }}>
                      {currentPage} / {totalPages}
                    </span>
                    <button 
                      className="action-btn copy-btn"
                      style={{ width: "32px", height: "32px", opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      <FiArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </>
  );
}

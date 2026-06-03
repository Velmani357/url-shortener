import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";
import { FiUploadCloud, FiLayers, FiCheck, FiCopy, FiAlertTriangle, FiDownload } from "react-icons/fi";
import "./Dashboard.css";

export default function BulkImport() {
  const { fetchUrls } = useOutletContext();

  const [parsedItems, setParsedItems] = useState([]); // [{ url, isValid }]
  const [bulkProgress, setBulkProgress] = useState(0);
  
  // Results logging
  const [showResults, setShowResults] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [bulkSuccessLog, setBulkSuccessLog] = useState([]);
  const [errorsLog, setErrorsLog] = useState([]); // [{ index, url, error }]
  
  const [copiedId, setCopiedId] = useState("");
  const token = localStorage.getItem("token");

  // Basic URL Validation helper
  const isValidUrlFormat = (string) => {
    try {
      const newUrl = new URL(string);
      return newUrl.protocol === "http:" || newUrl.protocol === "https:";
    } catch (err) {
      return false;
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File validation: extension check
    const extension = file.name.split(".").pop().toLowerCase();
    if (extension !== "csv" && extension !== "txt") {
      toast.error("Invalid file format. Only .csv or .txt files are supported.");
      return;
    }

    // File validation: empty file check
    if (file.size === 0) {
      toast.error("Selected file is empty.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n");
      const tempItems = [];

      for (let i = 0; i < lines.length; i++) {
        let trimmed = lines[i].trim();
        if (trimmed) {
          // Parse CSV: grab the first column before any comma
          const parts = trimmed.split(",");
          const potentialUrl = parts[0].trim();
          
          if (potentialUrl) {
            tempItems.push({
              index: i,
              url: potentialUrl,
              isValid: isValidUrlFormat(potentialUrl)
            });
          }
        }
      }

      if (tempItems.length === 0) {
        return toast.error("No URLs found in the file.");
      }

      setParsedItems(tempItems);
      setShowResults(false);
      setBulkSuccessLog([]);
      setErrorsLog([]);
      toast.success(`Successfully parsed ${tempItems.length} lines from file.`);
    };
    reader.readAsText(file);
    // Reset file input value to allow uploading the same file again
    e.target.value = null;
  };

  const handleProcessBulk = async () => {
    // Only send the valid URLs to the backend
    const validUrls = parsedItems.filter(item => item.isValid);
    const invalidUrls = parsedItems.filter(item => !item.isValid);

    if (validUrls.length === 0) {
      return toast.error("No valid URLs to process. Please check your file.");
    }

    toast.loading(`Shortening ${validUrls.length} URLs...`, { id: "bulk" });
    setBulkProgress(15);

    try {
      const res = await axios.post(
        `${BASE_URL}/shorten/bulk`,
        { urls: validUrls.map(item => item.url) },
        { headers: { Authorization: token } }
      );
      
      setBulkProgress(100);
      
      const successes = res.data.results || [];
      const backendErrors = res.data.errors || [];
      
      // Combine frontend invalid URLs with backend shortening errors
      const combinedErrors = [
        ...invalidUrls.map(item => ({
          index: item.index,
          url: item.url,
          error: "Invalid URL format (must start with http:// or https://)"
        })),
        ...backendErrors.map(err => ({
          index: err.index,
          url: err.url,
          error: err.error || "Server processing failed"
        }))
      ].sort((a, b) => a.index - b.index);

      setSuccessCount(successes.length);
      setFailedCount(combinedErrors.length);
      setBulkSuccessLog(successes);
      setErrorsLog(combinedErrors);
      setShowResults(true);
      setParsedItems([]); // Clear preview list

      toast.dismiss("bulk");
      toast.success(`Processed: ${successes.length} success, ${combinedErrors.length} failed`);
      
      await fetchUrls();
    } catch (err) {
      toast.dismiss("bulk");
      toast.error("Bulk shorten request failed");
    } finally {
      setTimeout(() => setBulkProgress(0), 1500);
    }
  };

  const downloadErrorReport = () => {
    if (errorsLog.length === 0) return;
    
    // Construct CSV content
    let csvContent = "data:text/csv;charset=utf-8,Line,URL,Error Reason\n";
    errorsLog.forEach((err) => {
      const escapedUrl = `"${err.url.replace(/"/g, '""')}"`;
      const escapedError = `"${err.error.replace(/"/g, '""')}"`;
      csvContent += `${err.index + 1},${escapedUrl},${escapedError}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_shortening_errors.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Error report CSV downloaded!");
  };

  const handleCopyLink = (shortCode, id) => {
    const link = `${BASE_URL}/${shortCode}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success("Link copied!");
    setTimeout(() => setCopiedId(""), 2000);
  };

  return (
    <>
      <div className="page-header">
        <h1>Bulk Import URLs</h1>
      </div>
      <p className="page-description">Upload formatted CSV or TXT text files to shorten dozens of links instantly.</p>

      <div className="bulk-container" style={{ marginTop: "20px" }}>
        <div className="glass-panel">
          <h2 className="panel-title"><FiLayers /> CSV Batch Loader</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
            Select a `.csv` or `.txt` file containing a clean list of target URLs. We will parse it on-the-fly and prepare them for batch shortening.
          </p>

          <label className="csv-drag-zone">
            <FiUploadCloud className="csv-icon" />
            <span style={{ fontSize: "16px", fontWeight: "600" }}>Upload URLs List File</span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Supports CSV and TXT files with full HTTP/HTTPS paths</span>
            <input 
              type="file" 
              accept=".csv,.txt" 
              style={{ display: "none" }} 
              onChange={handleCSVUpload}
            />
          </label>

          {/* Parsed CSV Preview Table */}
          {parsedItems.length > 0 && (
            <div className="bulk-preview">
              <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "15px" }}>
                Ready to Shorten ({parsedItems.length} URLs parsed)
              </h3>
              
              <div className="table-container" style={{ maxHeight: "250px", overflowY: "auto", marginBottom: "20px" }}>
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>Line</th>
                      <th>Parsed Destination URL</th>
                      <th style={{ width: "160px" }}>Format Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ color: "var(--text-muted)" }}>#{item.index + 1}</td>
                        <td className="url-col"><div className="url-truncated" title={item.url}>{item.url}</div></td>
                        <td>
                          {item.isValid ? (
                            <span className="badge badge-clicks" style={{ color: "var(--green)", borderColor: "var(--green)", background: "rgba(16,185,129,0.1)" }}>
                              <FiCheck style={{ verticalAlign: "middle", marginRight: "3px" }} /> Valid Format
                            </span>
                          ) : (
                            <span className="badge badge-expired" style={{ color: "var(--magenta)", borderColor: "var(--magenta)", background: "rgba(255,0,127,0.1)" }}>
                              <FiAlertTriangle style={{ verticalAlign: "middle", marginRight: "3px" }} /> Invalid Link
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkProgress > 0 && (
                <div style={{ margin: "15px 0" }}>
                  <div className="bulk-progress-bar-container">
                    <div className="bulk-progress-bar" style={{ width: `${bulkProgress}%` }}></div>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--cyan)" }}>Processing batch shortening, please wait...</span>
                </div>
              )}

              <button className="cyber-btn" onClick={handleProcessBulk} style={{ width: "100%" }}>
                Shorten Valid URLs ({parsedItems.filter(i => i.isValid).length})
              </button>
            </div>
          )}

          {/* Results Summary Board */}
          {showResults && (
            <div style={{ marginTop: "40px", borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: "30px" }}>
              <h3 style={{ fontSize: "14px", textTransform: "uppercase", color: "var(--cyan)", marginBottom: "20px" }}>
                Batch Processing Summary
              </h3>

              {/* Stats badges */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1.5px solid var(--green)", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "var(--green)", fontWeight: "bold", textTransform: "uppercase" }}>Success Count</div>
                  <div style={{ fontSize: "36px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "#fff" }}>
                    {successCount}
                  </div>
                </div>
                <div style={{ background: "rgba(255, 0, 127, 0.08)", border: "1.5px solid var(--magenta)", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "var(--magenta)", fontWeight: "bold", textTransform: "uppercase" }}>Failed Count</div>
                  <div style={{ fontSize: "36px", fontFamily: "Orbitron", fontWeight: "bold", marginTop: "5px", color: "#fff" }}>
                    {failedCount}
                  </div>
                  {failedCount > 0 && (
                    <button 
                      className="cyber-btn" 
                      onClick={downloadErrorReport}
                      style={{ marginTop: "10px", padding: "6px 12px", fontSize: "10px", width: "auto", background: "var(--magenta)", color: "#fff", border: "none", boxShadow: "none" }}
                    >
                      <FiDownload style={{ marginRight: "4px", verticalAlign: "middle" }} /> Download Error CSV
                    </button>
                  )}
                </div>
              </div>

              {/* Success log list */}
              {bulkSuccessLog.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13px", textTransform: "uppercase", color: "var(--green)", marginBottom: "12px" }}>
                    Successfully Shortened links
                  </h4>
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
                                href={`${BASE_URL}/${url.shortCode}`} 
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
                                style={{ width: "36px", height: "36px", fontSize: "14px" }}
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
          )}
        </div>
      </div>
    </>
  );
}

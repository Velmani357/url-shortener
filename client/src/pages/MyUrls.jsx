import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";
import { 
  FiCopy, FiEdit2, FiTrash2, FiExternalLink, FiBarChart2, FiPlus, FiSearch
} from "react-icons/fi";
import { 
  FaWhatsapp, FaTelegramPlane, FaEnvelope, FaShareAlt, FaCopy, FaDownload, FaQrcode 
} from "react-icons/fa";
import { QRCodeCanvas } from "qrcode.react";
import "./Dashboard.css";

export default function MyUrls() {
  const { urls, fetchUrls, loading } = useOutletContext();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  
  // Edit URL states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUrlId, setEditUrlId] = useState("");
  const [newDestination, setNewDestination] = useState("");

  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUrlId, setDeleteUrlId] = useState("");

  // Share/QR modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);

  const token = localStorage.getItem("token");

  const handleDeleteClick = (id) => {
    setDeleteUrlId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/url/${deleteUrlId}`, {
        headers: { Authorization: token },
      });
      toast.success("Link deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeleteUrlId("");
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
      await axios.put(
        `${BASE_URL}/url/${editUrlId}`,
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

  const handleCopyLink = (shortCode) => {
    const link = `${BASE_URL}/${shortCode}`;
    navigator.clipboard.writeText(link);
    toast.success("Copied to clipboard!");
  };

  const handleOpenShare = (url) => {
    setShareUrl(url);
    setIsShareModalOpen(true);
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
    const link = `${BASE_URL}/${code}`;
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

  const filteredUrls = urls.filter(u => 
    u.longUrl.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.shortCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, i) => (
      <tr key={i} className="skeleton-row">
        <td>
          <div className="skeleton skeleton-text" style={{ width: "80%" }}></div>
          <div className="skeleton skeleton-text" style={{ width: "40%", height: "8px", marginTop: "8px" }}></div>
        </td>
        <td><div className="skeleton skeleton-text" style={{ width: "60%" }}></div></td>
        <td><div className="skeleton skeleton-badge"></div></td>
        <td><div className="skeleton skeleton-badge"></div></td>
        <td>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="skeleton skeleton-btn"></div>
            <div className="skeleton skeleton-btn"></div>
            <div className="skeleton skeleton-btn"></div>
            <div className="skeleton skeleton-btn"></div>
            <div className="skeleton skeleton-btn"></div>
          </div>
        </td>
      </tr>
    ));
  };

  const renderEmptyState = () => (
    <div className="empty-state" style={{ textAlign: "center", padding: "50px 20px" }}>
      <div style={{ fontSize: "50px", marginBottom: "15px" }}>🔗</div>
      <h3 style={{ color: "var(--cyan)", fontFamily: "Orbitron" }}>No Links Shortened Yet</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "8px", marginBottom: "25px" }}>Create your first shortened link to see it in your catalog.</p>
      <button className="cyber-btn" style={{ fontSize: "13px", padding: "10px 20px" }} onClick={() => navigate("/dashboard/create")}>
        Shorten a Link Now
      </button>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <h1>My Short URLs</h1>
      </div>
      <p className="page-description">Manage, search, and share your generated shortened links.</p>

      <div className="glass-panel" style={{ marginTop: "20px" }}>
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
          <button 
            className="cyber-btn" 
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", height: "auto" }} 
            onClick={() => navigate("/dashboard/create")}
          >
            <FiPlus /> New URL
          </button>
        </div>

        <div className="table-container">
          {loading ? (
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
              <tbody>{renderSkeletons()}</tbody>
            </table>
          ) : filteredUrls.length === 0 ? (
            renderEmptyState()
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
                {filteredUrls.map((url) => {
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
                          href={`${BASE_URL}/${url.shortCode}`} 
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
                            onClick={() => handleCopyLink(url.shortCode)}
                            data-tooltip="Copy short URL link"
                          >
                            <FiCopy />
                          </button>
                          <button 
                            className="action-btn view-btn"
                            onClick={() => navigate(`/dashboard/analytics?id=${url._id}`)}
                            data-tooltip="View performance insights"
                          >
                            <FiBarChart2 />
                          </button>
                          <button 
                            className="action-btn edit-btn"
                            onClick={() => handleEditClick(url)}
                            data-tooltip="Edit destination URL"
                          >
                            <FiEdit2 />
                          </button>
                          <button 
                            className="action-btn share-btn"
                            onClick={() => handleOpenShare(url)}
                            data-tooltip="QR code & Share options"
                          >
                            <FaQrcode />
                          </button>
                          <button 
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteClick(url._id)}
                            data-tooltip="Delete link permanent"
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

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ borderColor: "var(--magenta)", boxShadow: "0 0 30px rgba(255, 0, 127, 0.2)" }}>
            <h3 className="modal-header" style={{ color: "var(--magenta)" }}>Confirm Permanent Deletion</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "25px", textAlign: "center" }}>
              Are you sure you want to delete the shortened link <span style={{ color: "var(--cyan)", fontWeight: "bold" }}>/{urls.find(u => u._id === deleteUrlId)?.shortCode}</span>? This action cannot be undone.
            </p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button 
                className="modal-btn cancel" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteUrlId("");
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn" 
                style={{ background: "var(--magenta)", color: "#fff", border: "none", boxShadow: "0 0 15px rgba(255, 0, 127, 0.4)" }}
                onClick={confirmDelete}
              >
                Delete Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE & SHARING MODAL */}
      {isShareModalOpen && shareUrl && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "420px", textAlign: "center" }}>
            <h3 className="modal-header">QR Code & Share</h3>
            
            <div className="qr-card-content" style={{ marginTop: "10px" }}>
              <div className="qr-canvas-container" style={{ background: "#fff", padding: "12px", borderRadius: "10px", display: "inline-block" }}>
                <QRCodeCanvas 
                  value={`${BASE_URL}/${shareUrl.shortCode}`} 
                  size={160}
                  id={`qr-${shareUrl.shortCode}`}
                  level={"H"}
                />
              </div>
              
              <div style={{ display: "flex", gap: "10px", width: "100%", justifyContent: "center", marginTop: "15px" }}>
                <button 
                  className="cyber-btn" 
                  style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", width: "auto" }}
                  onClick={() => downloadQRCode(shareUrl.shortCode)}
                >
                  <FaDownload /> Download QR
                </button>
                <button 
                  className="cyber-btn" 
                  style={{ padding: "8px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px", width: "auto", background: "rgba(0,0,0,0.5)", border: "1px solid var(--cyan)", color: "#fff" }}
                  onClick={() => copyQRImage(shareUrl.shortCode)}
                >
                  <FaCopy /> Copy Image
                </button>
              </div>
            </div>

            <div style={{ margin: "20px 0 10px 0", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "15px" }}>
              <span className="input-label" style={{ display: "block", marginBottom: "8px" }}>Short Link URL</span>
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "var(--cyan)", fontFamily: "Share Tech Mono, monospace", fontSize: "15px" }}>
                  {`${BASE_URL}/${shareUrl.shortCode}`}
                </span>
                <button 
                  className="action-btn copy-btn" 
                  style={{ width: "32px", height: "32px" }}
                  onClick={() => handleCopyLink(shareUrl.shortCode)}
                >
                  <FiCopy size={14} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: "15px" }}>
              <span className="input-label" style={{ display: "block", marginBottom: "8px" }}>Quick Share To</span>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button 
                  className="action-btn"
                  title="Share on WhatsApp"
                  style={{ background: "#25D366", color: "#fff", border: "none", width: "40px", height: "40px" }}
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${BASE_URL}/${shareUrl.shortCode}`)}`, "_blank")}
                >
                  <FaWhatsapp size={18} />
                </button>
                <button 
                  className="action-btn"
                  title="Share on Telegram"
                  style={{ background: "#0088cc", color: "#fff", border: "none", width: "40px", height: "40px" }}
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(`${BASE_URL}/${shareUrl.shortCode}`)}&text=${encodeURIComponent("Check out this shortened link!")}`, "_blank")}
                >
                  <FaTelegramPlane size={18} />
                </button>
                <button 
                  className="action-btn"
                  title="Share via Email"
                  style={{ background: "#ea4335", color: "#fff", border: "none", width: "40px", height: "40px" }}
                  onClick={() => window.open(`mailto:?subject=Shortened%20Link&body=Check%20out%20this%20short%20link:%20${BASE_URL}/${shareUrl.shortCode}`, "_blank")}
                >
                  <FaEnvelope size={18} />
                </button>
                <button 
                  className="action-btn"
                  title="Native System Share"
                  style={{ background: "var(--cyan)", color: "var(--bg-darker)", border: "none", width: "40px", height: "40px" }}
                  onClick={() => shareNative(shareUrl.shortCode)}
                >
                  <FaShareAlt size={18} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: "30px", display: "flex", justifyContent: "center" }}>
              <button className="modal-btn cancel" onClick={() => { setIsShareModalOpen(false); setShareUrl(null); }}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

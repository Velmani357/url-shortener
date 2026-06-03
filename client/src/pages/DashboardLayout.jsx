import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";
import { 
  FiGrid, FiPlus, FiLink, FiBarChart2, FiLayers, FiLogOut, FiActivity, FiSettings
} from "react-icons/fi";
import "./Dashboard.css";

export default function DashboardLayout() {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.email || "SaaS User");
      } catch (e) {
        setUserEmail("SaaS User");
      }
    }
    fetchUrls();
  }, [token]);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/myurls`, {
        headers: { Authorization: token },
      });
      setUrls(res.data);
    } catch (err) {
      toast.error("Failed to load URLs");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <FiActivity style={{ color: "var(--cyan)" }} /> NEXUS
          </div>
          <nav className="sidebar-menu">
            <NavLink 
              to="/dashboard" 
              end
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiGrid className="sidebar-item-icon" /> Dashboard Overview
            </NavLink>
            <NavLink 
              to="/dashboard/create" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiPlus className="sidebar-item-icon" /> Shorten URL
            </NavLink>
            <NavLink 
              to="/dashboard/urls" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiLink className="sidebar-item-icon" /> My URLs
            </NavLink>
            <NavLink 
              to="/dashboard/analytics" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiBarChart2 className="sidebar-item-icon" /> Detailed Analytics
            </NavLink>
            <NavLink 
              to="/dashboard/bulk" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiLayers className="sidebar-item-icon" /> Bulk Import
            </NavLink>
            <NavLink 
              to="/dashboard/settings" 
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
            >
              <FiSettings className="sidebar-item-icon" /> Settings
            </NavLink>
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
        <Outlet context={{ urls, fetchUrls, loading, userEmail }} />
      </main>
    </div>
  );
}

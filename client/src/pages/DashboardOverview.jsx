import { useOutletContext } from "react-router-dom";
import "./Dashboard.css";

export default function DashboardOverview() {
  const { urls, loading } = useOutletContext();

  if (loading) {
    return <div className="placeholder-text">Loading dashboard metrics...</div>;
  }

  // Calculate Metrics
  const totalLinks = urls.length;
  const totalClicks = urls.reduce((acc, curr) => acc + curr.clickCount, 0);
  const activeLinks = urls.filter(u => !u.expiresAt || new Date(u.expiresAt) > new Date()).length;
  const expiredLinks = totalLinks - activeLinks;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard Overview</h1>
      </div>
      <p className="page-description">Overview of link metrics and overall shortened link statistics.</p>

      <section className="stats-grid" style={{ marginTop: "20px" }}>
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
    </>
  );
}

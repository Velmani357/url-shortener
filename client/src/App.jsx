import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import CreateShortUrl from "./pages/CreateShortUrl";
import MyUrls from "./pages/MyUrls";
import Analytics from "./pages/Analytics";
import BulkImport from "./pages/BulkImport";
import Settings from "./pages/Settings";
import PublicStats from "./pages/PublicStats";
import ParticlesBackground from "./pages/ParticlesBackground";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function Layout() {
  const location = useLocation();
  const isLogin = location.pathname === "/";

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#fff",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />

      {/* ONLY LOGIN PAGE BACKGROUND */}
      {isLogin && <ParticlesBackground />}

      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          <Route path="create" element={<CreateShortUrl />} />
          <Route path="urls" element={<MyUrls />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="bulk" element={<BulkImport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route
          path="/stats/:shortCode"
          element={<PublicStats />}
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
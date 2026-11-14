import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './layouts/Layout';
import { canAccess } from './utils/rbac';

import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CadetRecords from './pages/CadetRecords';
import CadetProfile from './pages/CadetProfile';
import OPDQueue from './pages/OPDQueue';
import Consultation from './pages/Consultation';
import CompounderPortal from './pages/CompounderPortal';
import WardBeds from './pages/WardBeds';
import Pharmacy from './pages/Pharmacy';
import LabRadiology from './pages/LabRadiology';
import RestDutySlips from './pages/RestDutySlips';
import FitnessMedicals from './pages/FitnessMedicals';
import ReportsAnalytics from './pages/ReportsAnalytics';
import SettingsPage from './pages/Settings';

/** Guard: requires authentication and the given page permission. */
function Protected({ page, children }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (page && !canAccess(role, page)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center text-2xl">🔒</div>
        <h2 className="text-lg font-semibold text-slate-800">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Your current role does not have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <button onClick={() => window.history.back()} className="btn-secondary btn-sm mt-2">Go Back</button>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public website: first page visitors see */}
      <Route path="/" element={<Landing />} />

      <Route path="/dashboard" element={<Protected page="dashboard"><Layout><Dashboard /></Layout></Protected>} />
      <Route path="/cadets" element={<Protected page="cadets"><Layout><CadetRecords /></Layout></Protected>} />
      <Route path="/cadets/:id" element={<Protected page="cadets"><Layout><CadetProfile /></Layout></Protected>} />
      <Route path="/queue" element={<Protected page="queue"><Layout><OPDQueue /></Layout></Protected>} />
      <Route path="/consultation" element={<Protected page="consultation"><Layout><Consultation /></Layout></Protected>} />
      <Route path="/compounder" element={<Protected page="compounder"><Layout><CompounderPortal /></Layout></Protected>} />
      <Route path="/ward" element={<Protected page="ward"><Layout><WardBeds /></Layout></Protected>} />
      <Route path="/pharmacy" element={<Protected page="pharmacy"><Layout><Pharmacy /></Layout></Protected>} />
      <Route path="/lab" element={<Protected page="lab"><Layout><LabRadiology /></Layout></Protected>} />
      <Route path="/rest-duty" element={<Protected page="rest-duty"><Layout><RestDutySlips /></Layout></Protected>} />
      <Route path="/fitness" element={<Protected page="fitness"><Layout><FitnessMedicals /></Layout></Protected>} />
      <Route path="/reports" element={<Protected page="reports"><Layout><ReportsAnalytics /></Layout></Protected>} />
      <Route path="/settings" element={<Protected page="settings"><Layout><SettingsPage /></Layout></Protected>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

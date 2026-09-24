import { Navigate, Route, Routes } from "react-router-dom";
import "./admin.css";
import { getSession, isReifgoTier } from "./api.js";
import AdminLayout from "./components/AdminLayout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { CurrencyProvider } from "./currency.jsx";
import Categories from "./pages/Categories.jsx";
import Summit from "./pages/Summit.jsx";
import SummitInvitations from "./pages/SummitInvitations.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DeveloperForm from "./pages/DeveloperForm.jsx";
import DevelopersList from "./pages/DevelopersList.jsx";
import EventForm from "./pages/EventForm.jsx";
import EventsList from "./pages/EventsList.jsx";
import InsightForm from "./pages/InsightForm.jsx";
import InsightsList from "./pages/InsightsList.jsx";
import LeadDetail from "./pages/LeadDetail.jsx";
import Leads from "./pages/Leads.jsx";
import Team from "./pages/Team.jsx";
import Login from "./pages/Login.jsx";
import PropertiesList from "./pages/PropertiesList.jsx";
import PropertyForm from "./pages/PropertyForm.jsx";
import Users from "./pages/Users.jsx";
import Account from "./pages/Account.jsx";
import Approvals from "./pages/Approvals.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Staff from "./pages/Staff.jsx";
import Activity from "./pages/Activity.jsx";
import { can } from "./api.js";

// UI-level guard for REIFGO-only sections. Real enforcement is server-side.
// (This used to check the shared "admin" login alone, which locked real
// REIFGO accounts out of Developers, Forum and Users.)
function AdminOnly({ children }) {
  return isReifgoTier() ? children : <Navigate to="/admin" replace />;
}

function NeedsPermission({ permission, children }) {
  return can(permission) ? children : <Navigate to="/admin" replace />;
}

// REIFGO staff only — the events programme is REIFGO's, not a developer tool.
function ReifgoOnly({ children }) {
  return isReifgoTier() ? children : <Navigate to="/admin" replace />;
}

// Admin + developer (i.e. not a broker).
function StaffOnly({ children }) {
  return getSession()?.role !== "broker" ? children : <Navigate to="/admin" replace />;
}

// The CMS. Mounted lazily at /admin/* — see src/App.jsx.
export default function AdminApp() {
  return (
    <div className="adm-root">
      <ToastProvider>
        <CurrencyProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<PropertiesList />} />
            <Route path="properties/new" element={<PropertyForm />} />
            <Route path="properties/:id" element={<PropertyForm />} />
            <Route path="developers" element={<AdminOnly><DevelopersList /></AdminOnly>} />
            <Route path="developers/new" element={<AdminOnly><DeveloperForm /></AdminOnly>} />
            <Route path="developers/:id" element={<AdminOnly><DeveloperForm /></AdminOnly>} />
            <Route path="company" element={<NeedsPermission permission="edit_company"><DeveloperForm selfMode /></NeedsPermission>} />
            <Route path="account" element={<Account />} />
            <Route path="approvals" element={<AdminOnly><Approvals /></AdminOnly>} />
            <Route path="amenities" element={<Navigate to="/admin/developers" replace />} />
            <Route path="staff" element={<AdminOnly><Staff /></AdminOnly>} />
            <Route path="activity" element={<Activity />} />
            {/* Events are REIFGO's own, not a developer tool (September round). */}
            <Route path="events" element={<ReifgoOnly><EventsList /></ReifgoOnly>} />
            <Route path="events/new" element={<ReifgoOnly><EventForm /></ReifgoOnly>} />
            <Route path="events/:id" element={<ReifgoOnly><EventForm /></ReifgoOnly>} />
            <Route path="insights" element={<InsightsList />} />
            <Route path="insights/new" element={<InsightForm />} />
            <Route path="insights/:id" element={<InsightForm />} />
            <Route path="categories" element={<StaffOnly><Categories /></StaffOnly>} />
            <Route path="summit" element={<AdminOnly><Summit /></AdminOnly>} />
            <Route path="summit/invitations" element={<AdminOnly><SummitInvitations /></AdminOnly>} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
          </Route>
        </Routes>
        </CurrencyProvider>
      </ToastProvider>
    </div>
  );
}

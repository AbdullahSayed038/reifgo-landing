import { Navigate, Route, Routes } from "react-router-dom";
import "./admin.css";
import AdminLayout from "./components/AdminLayout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { CurrencyProvider } from "./currency.jsx";
import Categories from "./pages/Categories.jsx";
import Summit from "./pages/Summit.jsx";
import SummitInvitations from "./pages/SummitInvitations.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DashboardV2 from "./pages/DashboardV2.jsx";
import LeadsV2 from "./pages/LeadsV2.jsx";
import { DesignProvider, Versioned } from "./design.jsx";
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
import InvestorDetail from "./pages/InvestorDetail.jsx";
import Account from "./pages/Account.jsx";
import Approvals from "./pages/Approvals.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Staff from "./pages/Staff.jsx";
import Activity from "./pages/Activity.jsx";

// The CMS. Mounted lazily at /admin/* — see src/App.jsx.
export default function AdminApp() {
  return (
    <div className="adm-root">
      <ToastProvider>
        <CurrencyProvider>
        <DesignProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route element={<AdminLayout />}>
            {/* V1 / V2: the sidebar switch (Syed, Sept 24). V1 stays as it was. */}
            <Route index element={<Versioned v1={<Dashboard />} v2={<DashboardV2 />} />} />
            {/* REIFGO lists every property (Oct 6). */}
            <Route path="properties" element={<PropertiesList />} />
            <Route path="properties/new" element={<PropertyForm />} />
            <Route path="properties/:id" element={<PropertyForm />} />
            <Route path="developers" element={<DevelopersList />} />
            <Route path="developers/new" element={<DeveloperForm />} />
            <Route path="developers/:id" element={<DeveloperForm />} />
            {/* Developers no longer sign in (Oct 6); old links land on the dashboard. */}
            <Route path="company" element={<Navigate to="/admin" replace />} />
            <Route path="account" element={<Account />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="amenities" element={<Navigate to="/admin/developers" replace />} />
            <Route path="staff" element={<Staff />} />
            <Route path="activity" element={<Activity />} />
            {/* Events are REIFGO's own, not a developer tool (September round). */}
            <Route path="events" element={<EventsList />} />
            <Route path="events/new" element={<EventForm />} />
            <Route path="events/:id" element={<EventForm />} />
            <Route path="insights" element={<InsightsList />} />
            <Route path="insights/new" element={<InsightForm />} />
            <Route path="insights/:id" element={<InsightForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="summit" element={<Summit />} />
            <Route path="summit/invitations" element={<SummitInvitations />} />
            {/* Who can open each page: canOpen() in api.js, applied in AdminLayout. */}
            <Route path="leads" element={<Versioned v1={<Leads />} v2={<LeadsV2 />} />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="team" element={<Team />} />
            <Route path="users" element={<Users />} />
            <Route path="users/:id" element={<InvestorDetail />} />
          </Route>
        </Routes>
        </DesignProvider>
        </CurrencyProvider>
      </ToastProvider>
    </div>
  );
}

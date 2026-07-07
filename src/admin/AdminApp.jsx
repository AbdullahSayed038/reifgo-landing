import { Route, Routes } from "react-router-dom";
import "./admin.css";
import AdminLayout from "./components/AdminLayout.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import { CurrencyProvider } from "./currency.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import DeveloperForm from "./pages/DeveloperForm.jsx";
import DevelopersList from "./pages/DevelopersList.jsx";
import EventForm from "./pages/EventForm.jsx";
import EventsList from "./pages/EventsList.jsx";
import Leads from "./pages/Leads.jsx";
import Login from "./pages/Login.jsx";
import PropertiesList from "./pages/PropertiesList.jsx";
import PropertyForm from "./pages/PropertyForm.jsx";
import Users from "./pages/Users.jsx";

// The CMS. Mounted lazily at /admin/* — see src/App.jsx.
export default function AdminApp() {
  return (
    <div className="adm-root">
      <ToastProvider>
        <CurrencyProvider>
        <Routes>
          <Route path="login" element={<Login />} />
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<PropertiesList />} />
            <Route path="properties/new" element={<PropertyForm />} />
            <Route path="properties/:id" element={<PropertyForm />} />
            <Route path="developers" element={<DevelopersList />} />
            <Route path="developers/new" element={<DeveloperForm />} />
            <Route path="developers/:id" element={<DeveloperForm />} />
            <Route path="events" element={<EventsList />} />
            <Route path="events/new" element={<EventForm />} />
            <Route path="events/:id" element={<EventForm />} />
            <Route path="leads" element={<Leads />} />
            <Route path="users" element={<Users />} />
          </Route>
        </Routes>
        </CurrencyProvider>
      </ToastProvider>
    </div>
  );
}

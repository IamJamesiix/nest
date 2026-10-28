import { Route, Routes } from "react-router-dom";
import { DashboardLayout, PublicLayout, RequireRole } from "./components/Layouts";

import Home from "./pages/Home";
import Browse from "./pages/Browse";
import ListingDetails from "./pages/ListingDetails";
import Compare from "./pages/Compare";
import AgentProfile from "./pages/AgentProfile";
import { Login, Register } from "./pages/Auth";
import NotFound from "./pages/NotFound";

import MyInspections from "./pages/student/MyInspections";
import Favourites from "./pages/student/Favourites";
import Roommates from "./pages/student/Roommates";

import AgentDashboard from "./pages/agent/AgentDashboard";
import ListingForm from "./pages/agent/ListingForm";
import AgentInspections from "./pages/agent/AgentInspections";
import Verification from "./pages/agent/Verification";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import AdminReports from "./pages/admin/AdminReports";
import AdminAdmins from "./pages/admin/AdminAdmins";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Browse />} />
        <Route path="/listings/:id" element={<ListingDetails />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/agents/:id" element={<AgentProfile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<RequireRole roles={["student"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/me/inspections" element={<MyInspections />} />
          <Route path="/me/favourites" element={<Favourites />} />
          <Route path="/roommates" element={<Roommates />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["agent"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/agent" element={<AgentDashboard />} />
          <Route path="/agent/listings/new" element={<ListingForm />} />
          <Route path="/agent/listings/:id/edit" element={<ListingForm />} />
          <Route path="/agent/inspections" element={<AgentInspections />} />
          <Route path="/agent/verification" element={<Verification />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/agents" element={<AdminAgents />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/admins" element={<AdminAdmins />} />
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

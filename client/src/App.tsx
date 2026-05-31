import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import Layout from "./components/layout/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Payroll from "./pages/Payroll";
import Employees from "./pages/Employees";
import LeaveApprovals from "./pages/LeaveApprovals";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import SuperAdmin from "./pages/SuperAdmin";

// Wrap routes with socket provider so we have access to auth user
const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <SocketProvider userId={user?.id}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/employees/:id" element={<Profile />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/time-off" element={<Leave />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/leave-approvals" element={<LeaveApprovals />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SocketProvider>
  );
};

const App = () => (
  <TooltipProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  </TooltipProvider>
);

export default App;

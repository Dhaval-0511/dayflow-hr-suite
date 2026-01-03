import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeDashboard from './EmployeeDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard: React.FC = () => {
  const { role } = useAuth();
  const isAdminOrHR = role === 'admin' || role === 'hr';

  return isAdminOrHR ? <AdminDashboard /> : <EmployeeDashboard />;
};

export default Dashboard;

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, User, Clock, Calendar, Wallet, Users,
  ClipboardCheck, Bell, BarChart3, LogOut, Building2,
  ChevronLeft, ChevronRight, Shield, CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminOrHR = role === 'admin' || role === 'hr' || role === 'super_admin';

  const employeeLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'My Profile', icon: User },
    { href: '/attendance', label: 'Attendance', icon: Clock },
    { href: '/leave', label: 'Time Off', icon: Calendar },
    { href: '/payroll', label: 'Payroll', icon: Wallet },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/attendance', label: 'Attendance', icon: Clock },
    { href: '/leave', label: 'Time Off', icon: Calendar },
    { href: '/leave-approvals', label: 'Leave Approvals', icon: CheckSquare },
    { href: '/payroll', label: 'Payroll', icon: Wallet },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ];

  const superAdminExtra = [
    { href: '/super-admin', label: 'Super Admin', icon: Shield },
  ];

  const links = [
    ...(isAdminOrHR ? adminLinks : employeeLinks),
    ...(role === 'super_admin' ? superAdminExtra : []),
  ];

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href + '/'));
    const content = (
      <Link to={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-primary text-sidebar-primary-foreground',
          !isActive && 'text-sidebar-foreground/80',
          collapsed && 'justify-center px-2'
        )}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return content;
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40',
      'flex flex-col border-r border-sidebar-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border', collapsed && 'justify-center px-2')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-base">Dayflow</h1>
              <p className="text-xs text-sidebar-foreground/60">HRMS</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map(link => <NavItem key={link.href} {...link} />)}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
              {user.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                : `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button variant="ghost"
              onClick={() => { signOut(); navigate('/auth'); }}
              className={cn(
                'w-full text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                collapsed ? 'px-2 justify-center' : 'justify-start'
              )}>
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="ml-3 text-sm">Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Sign Out</TooltipContent>}
        </Tooltip>
      </div>

      {/* Collapse Toggle */}
      <button onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-purple-600 text-white shadow-md flex items-center justify-center hover:scale-110 transition-transform z-50">
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
};

export default Sidebar;

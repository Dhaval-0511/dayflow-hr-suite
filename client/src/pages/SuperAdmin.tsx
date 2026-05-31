import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Shield, Building2, Users, Activity, ToggleLeft, ToggleRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

const SuperAdmin: React.FC = () => {
  const { role } = useAuth();
  const [tab, setTab] = useState<'companies' | 'audit'>('companies');
  const [companies, setCompanies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  if (role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    const load = async () => {
      try {
        const [c, s] = await Promise.all([api.getCompanies(), api.getSystemStats()]);
        setCompanies(c); setStats(s);
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const loadAudit = async () => {
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(data.logs || []);
    } catch { toast.error('Failed to load audit logs'); }
  };

  useEffect(() => { if (tab === 'audit') loadAudit(); }, [tab]);

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const result = await api.toggleCompany(id);
      toast.success(result.message);
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive: result.isActive } : c));
    } catch { toast.error('Failed to toggle company'); }
    finally { setToggling(null); }
  };

  const ACTION_COLOR: Record<string, string> = {
    CREATE_EMPLOYEE: 'text-green-400',
    DELETE_EMPLOYEE: 'text-red-400',
    UPDATE_SALARY: 'text-yellow-400',
    APPROVE_LEAVE: 'text-blue-400',
    REJECTED_LEAVE: 'text-orange-400',
    UPDATE_EMPLOYEE: 'text-purple-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg"><Shield className="h-5 w-5 text-red-400" /></div>
        <div>
          <h1 className="text-xl font-semibold">Super Admin Panel</h1>
          <p className="text-sm text-muted-foreground">System-wide controls and monitoring</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Companies', value: stats.totalCompanies, icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Total Leaves', value: stats.totalLeaves, icon: ClipboardList, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Audit Entries', value: stats.totalAuditLogs, icon: Activity, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="border border-border rounded-xl p-4 bg-card">
              <div className={`p-2 rounded-lg w-fit mb-3 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        {[['companies', 'Companies'], ['audit', 'Audit Logs']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${tab === key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'companies' && (
        <div className="space-y-3">
          {loading ? <div className="text-center text-muted-foreground text-sm py-8">Loading...</div>
            : companies.map(c => (
              <div key={c.id} className="border border-border rounded-xl p-4 bg-card flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold border border-border">
                    {c.abbreviation || c.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.employeeCount} employees · Created {new Date(c.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${c.isActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(c.id)} disabled={toggling === c.id}
                    className="h-7 gap-1 text-xs">
                    {c.isActive ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{['Actor', 'Action', 'Entity', 'Time'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No audit logs yet</td></tr>
              ) : auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium">{log.actor}</p>
                    <p className="text-xs text-muted-foreground">{log.actorEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono font-medium ${ACTION_COLOR[log.action] || 'text-muted-foreground'}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{log.entity}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

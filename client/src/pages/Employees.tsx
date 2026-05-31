import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, Employee } from '@/lib/api';
import { Search, Plus, Trash2, UserCircle, Mail, Building2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddEmployeeDialog from './employees/AddEmployeeDialog';
import { toast } from 'sonner';

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  hr: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  employee: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const Employees: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'hr' || role === 'super_admin';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const emps = await api.getEmployees();
      setEmployees(emps);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Delete ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) return;
    setDeleting(emp.id);
    try {
      await api.deleteEmployee(emp.id);
      toast.success('Employee deleted');
      load();
    } catch { toast.error('Failed to delete employee'); }
    finally { setDeleting(null); }
  };

  const departments = ['all', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean) as string[]))];

  const filtered = employees.filter(e => {
    const matchesSearch = `${e.firstName} ${e.lastName} ${e.email} ${e.loginId}`.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || e.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5">
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, login ID..." className="pl-8 h-8 text-xs" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="h-8 text-xs px-3 rounded-md border border-input bg-background text-foreground">
          {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading employees...</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Employee', 'Login ID', 'Department / Role', 'Email', isAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">No employees found</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold border border-border overflow-hidden">
                        {emp.avatar
                          ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                          : `${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.jobPosition || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.loginId}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3 text-muted-foreground" />{emp.department || '—'}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium w-fit ${ROLE_BADGE[emp.role] || ''}`}>
                        <Shield className="h-2.5 w-2.5 inline mr-1" />{emp.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{emp.email}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/employees/${emp.id}`)}
                          className="h-7 px-2 text-xs">
                          <UserCircle className="h-3.5 w-3.5" />
                        </Button>
                        {emp.id !== user?.id && (
                          <Button size="sm" variant="ghost"
                            onClick={() => handleDelete(emp)}
                            disabled={deleting === emp.id}
                            className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" />Admin: {employees.filter(e => e.role === 'admin').length}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />HR: {employees.filter(e => e.role === 'hr').length}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" />Employees: {employees.filter(e => e.role === 'employee').length}</span>
        <span className="ml-auto">Showing {filtered.length} of {employees.length}</span>
      </div>

      <AddEmployeeDialog open={showAdd} onClose={() => setShowAdd(false)} onCreated={load} />
    </div>
  );
};

export default Employees;

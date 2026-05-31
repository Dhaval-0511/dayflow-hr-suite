import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, Employee, AttendanceRecord } from '@/lib/api';
import { Search, Plus, LogIn, LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddEmployeeDialog from './employees/AddEmployeeDialog';

const getInitials = (emp: Employee) =>
  `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'present') return (
    <span className="w-3 h-3 rounded-full bg-green-500 block shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
  );
  if (status === 'leave') return <span className="text-blue-400 text-sm">✈</span>;
  return <span className="w-3 h-3 rounded-full bg-yellow-500 block" />;
};

const Dashboard: React.FC = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayAtt, setTodayAtt] = useState<AttendanceRecord | null>(null);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [timer, setTimer] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [empStatuses, setEmpStatuses] = useState<Record<string, string>>({});
  const isAdminOrHR = role === 'admin' || role === 'hr';

  const refresh = useCallback(async () => {
    try {
      const [emps, att] = await Promise.all([
        api.getEmployees(),
        api.getTodayAttendance(),
      ]);
      setEmployees(emps);
      setTodayAtt(att);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Timer effect
  useEffect(() => {
    if (!todayAtt?.checkIn || todayAtt?.checkOut) return;
    const tick = () => {
      const [h, m] = todayAtt.checkIn!.split(':').map(Number);
      const start = new Date();
      start.setHours(h, m, 0, 0);
      const diff = Math.floor((Date.now() - start.getTime()) / 1000);
      const hh = Math.floor(diff / 3600);
      const mm = Math.floor((diff % 3600) / 60);
      const ss = diff % 60;
      setTimer(`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [todayAtt]);

  // Load per-employee attendance statuses
  useEffect(() => {
    if (!isAdminOrHR) return;
    const loadStatuses = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const att = await api.getAttendance({ date: today });
        const leaveData = await api.getLeave();
        const statuses: Record<string, string> = {};
        for (const emp of employees) {
          const empAtt = att.find((a: AttendanceRecord) => a.employeeId === emp.id);
          if (empAtt?.status === 'present') { statuses[emp.id] = 'present'; continue; }
          const onLeave = leaveData.some((l: { employeeId: string; status: string; startDate: string; endDate: string }) =>
            l.employeeId === emp.id && l.status === 'approved' &&
            l.startDate <= today && l.endDate >= today
          );
          statuses[emp.id] = onLeave ? 'leave' : 'absent';
        }
        setEmpStatuses(statuses);
      } catch {}
    };
    if (employees.length > 0) loadStatuses();
  }, [employees, isAdminOrHR]);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      const att = await api.checkIn();
      setTodayAtt(att);
    } catch (err: unknown) { alert((err as Error).message); }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const att = await api.checkOut();
      setTodayAtt(att);
    } catch (err: unknown) { alert((err as Error).message); }
    setLoading(false);
  };

  const filteredEmps = employees.filter(e =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const checkedIn = !!todayAtt?.checkIn;
  const checkedOut = !!todayAtt?.checkOut;

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Employee Grid */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-3">
          {isAdminOrHR && (
            <Button size="sm" onClick={() => setShowAddEmp(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs tracking-wider h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />NEW
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employees..." className="pl-8 h-8 text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredEmps.map(emp => {
            const status = isAdminOrHR
              ? (empStatuses[emp.id] || 'absent')
              : (emp.id === user?.id ? (checkedIn && !checkedOut ? 'present' : 'absent') : 'absent');
            return (
              <div key={emp.id}
                className="relative border border-border rounded-lg p-3 bg-card hover:bg-accent/50 cursor-pointer transition-all hover:shadow-md group"
                onClick={() => navigate(`/employees/${emp.id}`)}>
                <div className="absolute top-2 right-2">
                  <StatusDot status={status} />
                </div>
                <div className="flex flex-col items-center gap-2 pt-1">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg overflow-hidden border-2 border-border group-hover:border-purple-500 transition-colors">
                    {emp.avatar
                      ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" />
                      : getInitials(emp)
                    }
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium leading-tight">{emp.firstName} {emp.lastName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[90px]">{emp.jobPosition || emp.department}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 block" />Present in office
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 text-sm">✈</span>On leave
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 block" />Absent
          </div>
        </div>
      </div>

      {/* Right: Check In/Out Panel */}
      <div className="w-56 flex-shrink-0 space-y-3">
        {checkedIn && !checkedOut && (
          <div className="border border-border rounded-lg p-3 bg-card text-center">
            <p className="text-[10px] text-muted-foreground mb-1 font-mono">Since {todayAtt?.checkIn}</p>
            <div className="flex items-center justify-center gap-1.5 text-green-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono text-sm font-semibold">{timer}</span>
            </div>
          </div>
        )}

        {checkedOut && (
          <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5 text-center">
            <p className="text-xs text-green-400 font-medium">✓ Checked Out</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {todayAtt?.workHours?.toFixed(1)}h work · {todayAtt?.extraHours?.toFixed(1)}h extra
            </p>
          </div>
        )}

        {!checkedIn && (
          <Button onClick={handleCheckIn} disabled={loading}
            className="w-full bg-card border border-border hover:bg-accent text-foreground justify-between h-10">
            <span className="text-sm">Check IN</span>
            <LogIn className="h-4 w-4 text-green-400" />
          </Button>
        )}

        {checkedIn && !checkedOut && (
          <Button onClick={handleCheckOut} disabled={loading}
            className="w-full bg-card border border-border hover:bg-accent text-foreground justify-between h-10">
            <span className="text-sm">Check Out</span>
            <LogOut className="h-4 w-4 text-orange-400" />
          </Button>
        )}
      </div>

      <AddEmployeeDialog
        open={showAddEmp}
        onClose={() => setShowAddEmp(false)}
        onCreated={refresh}
      />
    </div>
  );
};

export default Dashboard;

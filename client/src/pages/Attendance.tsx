import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, AttendanceRecord, Employee } from '@/lib/api';
import { ChevronLeft, ChevronRight, Search, CalendarDays, Table2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const pad = (n: number) => n.toString().padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const STATUS_CELL: Record<string, string> = {
  present: 'bg-green-500 text-white',
  leave: 'bg-blue-500 text-white',
  'half-day': 'bg-orange-500 text-white',
  absent: 'bg-yellow-500/30 text-yellow-400',
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    present: 'bg-green-500/20 text-green-400 border-green-500/30',
    absent: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    leave: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'half-day': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] border font-medium capitalize ${map[status] || 'bg-muted text-muted-foreground border-border'}`}>{status}</span>;
};

// ─── Admin Day View (Table) ───────────────────────────────────────────────────
const AdminDayView: React.FC = () => {
  const [date, setDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const dateStr = fmtDate(date);
  useEffect(() => {
    const load = async () => {
      try {
        const [emps, att] = await Promise.all([api.getEmployees(), api.getAttendance({ date: dateStr })]);
        setEmployees(emps); setRecords(att);
      } catch (e) { console.error(e); }
    };
    load();
  }, [dateStr]);

  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };

  const rows = employees
    .filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()))
    .map(emp => ({ emp, att: records.find(a => a.employeeId === emp.id) }));

  const presentCount = rows.filter(r => r.att?.status === 'present').length;
  const absentCount = rows.filter(r => !r.att || r.att.status === 'absent').length;
  const onLeaveCount = rows.filter(r => r.att?.status === 'leave').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          <button onClick={prevDay} className="p-1.5 rounded hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-medium text-sm px-2">{date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          <button onClick={nextDay} className="p-1.5 rounded hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" />Present: {presentCount}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Leave: {onLeaveCount}</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" />Absent: {absentCount}</span>
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..." className="pl-8 h-8 text-xs w-52" />
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Employee', 'Check In', 'Check Out', 'Work Hours', 'Extra Hours', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No employees found</td></tr>
            ) : rows.map(({ emp, att }) => (
              <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                  <p className="text-xs text-muted-foreground">{emp.department}</p>
                </td>
                <td className="px-4 py-2.5 font-mono text-sm">{att?.checkIn || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-sm">{att?.checkOut || '—'}</td>
                <td className="px-4 py-2.5 text-sm">{att?.workHours ? `${parseFloat(String(att.workHours)).toFixed(2)}h` : '—'}</td>
                <td className="px-4 py-2.5 text-sm">{att?.extraHours ? `${parseFloat(String(att.extraHours)).toFixed(2)}h` : '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={att?.status || 'absent'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Employee Month Calendar Heatmap ─────────────────────────────────────────
const EmployeeMonthView: React.FC = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [view, setView] = useState<'calendar' | 'table'>('calendar');

  useEffect(() => {
    api.getAttendance({ month: String(month.getMonth() + 1), year: String(month.getFullYear()) })
      .then(setRecords).catch(() => {});
  }, [month]);

  const prevMonth = () => { const d = new Date(month); d.setMonth(d.getMonth() - 1); setMonth(d); };
  const nextMonth = () => { const d = new Date(month); d.setMonth(d.getMonth() + 1); setMonth(d); };

  const myRecords = records.filter(r => r.employeeId === user?.id);
  const recordMap = Object.fromEntries(myRecords.map(r => [r.date, r]));

  const year = month.getFullYear();
  const mon = month.getMonth();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const firstDay = new Date(year, mon, 1).getDay(); // 0 = Sunday

  const presentCount = myRecords.filter(r => r.status === 'present').length;
  const leaveCount = myRecords.filter(r => r.status === 'leave').length;
  const workingDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, mon, i + 1); return d.getDay() !== 0 && d.getDay() !== 6;
  }).filter(Boolean).length;

  const allDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (allDays.length % 7 !== 0) allDays.push(null);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
          <span className="font-medium text-sm px-2">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 ml-auto">
          <button onClick={() => setView('calendar')} className={`p-1.5 rounded ${view === 'calendar' ? 'bg-card shadow' : 'hover:bg-muted'}`}><CalendarDays className="h-4 w-4" /></button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded ${view === 'table' ? 'bg-card shadow' : 'hover:bg-muted'}`}><Table2 className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Days Present', value: presentCount, color: 'text-green-400' },
          { label: 'Leave Days', value: leaveCount, color: 'text-blue-400' },
          { label: 'Working Days', value: workingDays, color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-lg p-3 bg-card text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {view === 'calendar' ? (
        /* Calendar Heatmap */
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = `${year}-${pad(mon + 1)}-${pad(day)}`;
              const rec = recordMap[dateStr];
              const isWeekend = new Date(year, mon, day).getDay() === 0 || new Date(year, mon, day).getDay() === 6;
              const isToday = dateStr === fmtDate(new Date());
              return (
                <div key={i} title={rec?.status || (isWeekend ? 'weekend' : 'no data')}
                  className={`relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-default
                    ${isToday ? 'ring-2 ring-purple-500' : ''}
                    ${isWeekend ? 'bg-muted/20 text-muted-foreground/40' : rec ? STATUS_CELL[rec.status] || 'bg-muted/30 text-muted-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'}`}>
                  {day}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            {[['bg-green-500', 'Present'], ['bg-blue-500', 'Leave'], ['bg-orange-500', 'Half Day'], ['bg-yellow-500/30', 'Absent']].map(([cls, label]) => (
              <span key={label} className="flex items-center gap-1.5"><span className={`w-3 h-3 rounded ${cls}`} />{label}</span>
            ))}
          </div>
        </div>
      ) : (
        /* Table View */
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{['Date', 'Check In', 'Check Out', 'Work Hours', 'Extra Hours', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {myRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No records for this month</td></tr>
              ) : myRecords.map(r => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-sm">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2.5 font-mono">{r.checkIn || '—'}</td>
                  <td className="px-4 py-2.5 font-mono">{r.checkOut || '—'}</td>
                  <td className="px-4 py-2.5">{r.workHours ? `${parseFloat(String(r.workHours)).toFixed(2)}h` : '—'}</td>
                  <td className="px-4 py-2.5">{r.extraHours ? `${parseFloat(String(r.extraHours)).toFixed(2)}h` : '—'}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Attendance Page ─────────────────────────────────────────────────────
const Attendance: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'hr' || role === 'super_admin';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Daily roll-call view of all employees' : 'Your monthly attendance with calendar heatmap'}
        </p>
      </div>
      {isAdmin ? <AdminDayView /> : <EmployeeMonthView />}
    </div>
  );
};

export default Attendance;

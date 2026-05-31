import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Users, UserCheck, Calendar, Clock, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = { present: '#22c55e', absent: '#eab308', leave: '#3b82f6', halfDay: '#f97316' };

const Reports: React.FC = () => {
  const { role } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'admin' || role === 'hr' || role === 'super_admin') {
      api.getReports().then(setData).catch(console.error).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [role]);

  if (role !== 'admin' && role !== 'hr' && role !== 'super_admin') {
    return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Reports are only available to Admin and HR Officers.</div>;
  }
  if (loading) return <div className="text-muted-foreground text-sm py-8 text-center">Loading reports...</div>;

  const summary = data || {};
  const cards = [
    { label: 'Total Employees', value: summary.totalEmployees ?? 0, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Present Today', value: summary.presentToday ?? 0, icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Absent Today', value: summary.absentToday ?? 0, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Pending Leaves', value: summary.pendingLeaves ?? 0, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  const pieData = [
    { name: 'Present', value: summary.monthlyAttendance?.present || 0 },
    { name: 'Absent', value: summary.monthlyAttendance?.absent || 0 },
    { name: 'Leave', value: summary.monthlyAttendance?.leave || 0 },
    { name: 'Half Day', value: summary.monthlyAttendance?.halfDay || 0 },
  ].filter(d => d.value > 0);

  const pieColors = [COLORS.present, COLORS.absent, COLORS.leave, COLORS.halfDay];
  const deptData = (summary.departments || []).sort((a: any, b: any) => b.count - a.count);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Employees', summary.totalEmployees],
      ['Present Today', summary.presentToday],
      ['Absent Today', summary.absentToday],
      ['Pending Leaves', summary.pendingLeaves],
      [],
      ['Department', 'Headcount'],
      ...(summary.departments || []).map((d: any) => [d.name, d.count]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dayflow-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-400" />Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Company overview for {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="border border-border rounded-xl p-4 bg-card hover:border-purple-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department headcount bar chart */}
        <div className="border border-border rounded-xl p-4 bg-card">
          <h3 className="text-sm font-semibold mb-4">Department Headcount</h3>
          {deptData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">No department data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly attendance pie chart */}
        <div className="border border-border rounded-xl p-4 bg-card">
          <h3 className="text-sm font-semibold mb-4">This Month's Attendance</h3>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">No attendance data this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Attendance breakdown numbers */}
      {summary.monthlyAttendance && (
        <div className="border border-border rounded-xl p-4 bg-card">
          <h3 className="text-sm font-semibold mb-4">Monthly Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Present Records', value: summary.monthlyAttendance.present, color: 'text-green-400' },
              { label: 'Absent Records', value: summary.monthlyAttendance.absent, color: 'text-yellow-400' },
              { label: 'On Leave Records', value: summary.monthlyAttendance.leave, color: 'text-blue-400' },
              { label: 'Half Day Records', value: summary.monthlyAttendance.halfDay, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-muted/30">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

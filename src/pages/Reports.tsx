import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const Reports: React.FC = () => {
  // Fetch attendance stats for the last 6 months
  const { data: attendanceStats, isLoading: loadingAttendance } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = format(startOfMonth(date), 'yyyy-MM-dd');
        const end = format(endOfMonth(date), 'yyyy-MM-dd');
        
        const { data } = await supabase
          .from('attendance')
          .select('status')
          .gte('date', start)
          .lte('date', end);
        
        const present = data?.filter(a => a.status === 'present').length || 0;
        const absent = data?.filter(a => a.status === 'absent').length || 0;
        
        months.push({
          month: format(date, 'MMM'),
          present,
          absent,
        });
      }
      return months;
    },
  });

  // Fetch leave stats
  const { data: leaveStats, isLoading: loadingLeave } = useQuery({
    queryKey: ['leave-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('leave_type, status');
      
      const approved = data?.filter(l => l.status === 'approved') || [];
      
      return [
        { name: 'Paid', value: approved.filter(l => l.leave_type === 'paid').length, color: 'hsl(var(--primary))' },
        { name: 'Sick', value: approved.filter(l => l.leave_type === 'sick').length, color: 'hsl(var(--warning))' },
        { name: 'Casual', value: approved.filter(l => l.leave_type === 'casual').length, color: 'hsl(var(--info))' },
        { name: 'Unpaid', value: approved.filter(l => l.leave_type === 'unpaid').length, color: 'hsl(var(--muted-foreground))' },
      ];
    },
  });

  // Fetch department-wise employee count
  const { data: departmentStats, isLoading: loadingDept } = useQuery({
    queryKey: ['department-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('department')
        .eq('is_active', true);
      
      const deptCounts: Record<string, number> = {};
      data?.forEach(p => {
        const dept = p.department || 'Unassigned';
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });
      
      return Object.entries(deptCounts).map(([name, value]) => ({
        name,
        value,
      }));
    },
  });

  // Summary stats
  const { data: summaryStats } = useQuery({
    queryKey: ['summary-stats'],
    queryFn: async () => {
      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const today = format(new Date(), 'yyyy-MM-dd');
      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'present');

      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const thisMonth = format(new Date(), 'yyyy-MM');
      const { count: newHires } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('date_of_joining', `${thisMonth}-01`);

      return {
        totalEmployees: totalEmployees || 0,
        presentToday: presentToday || 0,
        pendingLeaves: pendingLeaves || 0,
        newHires: newHires || 0,
      };
    },
  });

  const COLORS = ['hsl(174, 62%, 35%)', 'hsl(142, 72%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Insights into your workforce</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.totalEmployees || 0}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.presentToday || 0}</p>
                <p className="text-sm text-muted-foreground">Present Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.pendingLeaves || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Leaves</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summaryStats?.newHires || 0}</p>
                <p className="text-sm text-muted-foreground">New This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
            <CardDescription>Monthly attendance for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="present" fill="hsl(var(--success))" name="Present" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Leave Distribution</CardTitle>
            <CardDescription>Approved leaves by type</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeave ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={leaveStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {leaveStats?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {leaveStats?.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                      <Badge variant="secondary">{entry.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle>Department Distribution</CardTitle>
            <CardDescription>Employee count by department</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDept ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={120} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" name="Employees" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;

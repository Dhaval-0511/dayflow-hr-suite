import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  Calendar, 
  Wallet, 
  TrendingUp,
  TrendingDown,
  UserPlus,
  ClipboardCheck,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard: React.FC = () => {
  // Fetch employee count
  const { data: employeeCount } = useQuery({
    queryKey: ['employee-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      return count || 0;
    },
  });

  // Fetch today's attendance summary
  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance-summary'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today);
      
      const present = data?.filter(a => a.status === 'present').length || 0;
      const absent = (employeeCount || 0) - present;
      return { present, absent, total: data?.length || 0 };
    },
  });

  // Fetch pending leave requests
  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves'],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (first_name, last_name, department)
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return { data: data || [], count: count || 0 };
    },
  });

  // Fetch recent employees
  const { data: recentEmployees } = useQuery({
    queryKey: ['recent-employees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const stats = [
    {
      title: 'Total Employees',
      value: employeeCount || 0,
      icon: Users,
      trend: '+5%',
      trendUp: true,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Present Today',
      value: todayAttendance?.present || 0,
      icon: CheckCircle2,
      trend: `${Math.round(((todayAttendance?.present || 0) / (employeeCount || 1)) * 100)}%`,
      trendUp: true,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending Leaves',
      value: pendingLeaves?.count || 0,
      icon: ClipboardCheck,
      trend: 'Requires action',
      trendUp: false,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Absent Today',
      value: todayAttendance?.absent || 0,
      icon: XCircle,
      trend: `${Math.round(((todayAttendance?.absent || 0) / (employeeCount || 1)) * 100)}%`,
      trendUp: false,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {stat.trendUp ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className="text-xs text-muted-foreground">{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link to="/employees">
          <Button variant="outline" className="w-full h-16 gap-3 justify-start">
            <Users className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Manage Employees</p>
              <p className="text-xs text-muted-foreground">View all employees</p>
            </div>
          </Button>
        </Link>
        <Link to="/attendance">
          <Button variant="outline" className="w-full h-16 gap-3 justify-start">
            <Clock className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Attendance Records</p>
              <p className="text-xs text-muted-foreground">Track attendance</p>
            </div>
          </Button>
        </Link>
        <Link to="/leave-approvals">
          <Button variant="outline" className="w-full h-16 gap-3 justify-start">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Leave Approvals</p>
              <p className="text-xs text-muted-foreground">{pendingLeaves?.count || 0} pending</p>
            </div>
          </Button>
        </Link>
        <Link to="/reports">
          <Button variant="outline" className="w-full h-16 gap-3 justify-start">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Reports & Analytics</p>
              <p className="text-xs text-muted-foreground">View insights</p>
            </div>
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Leave Requests */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>Requests awaiting your approval</CardDescription>
            </div>
            <Link to="/leave-approvals">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingLeaves?.data && pendingLeaves.data.length > 0 ? (
              <div className="space-y-3">
                {pendingLeaves.data.map((leave: any) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {leave.profiles?.first_name?.[0]}{leave.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {leave.profiles?.first_name} {leave.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {leave.leave_type} Leave • {leave.profiles?.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        to {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No pending leave requests</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Employees */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Employees</CardTitle>
              <CardDescription>Newly joined team members</CardDescription>
            </div>
            <Link to="/employees">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentEmployees && recentEmployees.length > 0 ? (
              <div className="space-y-3">
                {recentEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.designation || 'N/A'} • {employee.department || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{employee.employee_id}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No employees found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;

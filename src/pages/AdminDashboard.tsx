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
  ArrowRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];

  // Fetch all active employees
  const { data: allEmployees } = useQuery({
    queryKey: ['all-active-employees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true);
      return data || [];
    },
  });

  const employeeCount = allEmployees?.length || 0;

  // Fetch today's attendance with employee details
  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance-details'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles:user_id (id, first_name, last_name, employee_id, department, designation)
        `)
        .eq('date', today);
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Calculate present and absent employees
  const presentEmployees = todayAttendance?.filter(a => a.status === 'present' || a.status === 'half_day') || [];
  const presentEmployeeIds = new Set(todayAttendance?.map(a => a.user_id) || []);
  const absentEmployees = allEmployees?.filter(emp => !presentEmployeeIds.has(emp.id)) || [];

  // Fetch pending leave requests with employee details
  const { data: pendingLeaves } = useQuery({
    queryKey: ['pending-leaves-dashboard'],
    queryFn: async () => {
      const { data, count } = await supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (first_name, last_name, department, designation, employee_id)
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      return { data: data || [], count: count || 0 };
    },
    refetchInterval: 30000,
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
      value: employeeCount,
      icon: Users,
      trend: `${employeeCount} active`,
      trendUp: true,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Present Today',
      value: presentEmployees.length,
      icon: UserCheck,
      trend: `${Math.round((presentEmployees.length / (employeeCount || 1)) * 100)}% attendance`,
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
      value: absentEmployees.length,
      icon: UserX,
      trend: `${Math.round((absentEmployees.length / (employeeCount || 1)) * 100)}% absent`,
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

      {/* Main Content - 3 Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Present Employees */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-success" />
                Present Today
              </CardTitle>
              <CardDescription>{presentEmployees.length} employees checked in</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {presentEmployees.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {presentEmployees.slice(0, 6).map((attendance: any) => (
                  <div key={attendance.id} className="flex items-center justify-between p-2 bg-success/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success text-xs font-medium">
                        {attendance.profiles?.first_name?.[0]}{attendance.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {attendance.profiles?.first_name} {attendance.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attendance.check_in && format(new Date(attendance.check_in), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/10 text-success text-xs">
                      {attendance.status === 'half_day' ? 'Half Day' : 'Present'}
                    </Badge>
                  </div>
                ))}
                {presentEmployees.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{presentEmployees.length - 6} more employees
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No check-ins yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Absent Employees */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserX className="h-4 w-4 text-destructive" />
                Absent Today
              </CardTitle>
              <CardDescription>{absentEmployees.length} employees not checked in</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {absentEmployees.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {absentEmployees.slice(0, 6).map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-destructive/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xs font-medium">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.department || 'No department'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-xs">Absent</Badge>
                  </div>
                ))}
                {absentEmployees.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{absentEmployees.length - 6} more employees
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50 text-success" />
                <p className="text-sm">All employees present!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-warning" />
                Pending Leaves
              </CardTitle>
              <CardDescription>{pendingLeaves?.count || 0} requests awaiting approval</CardDescription>
            </div>
            <Link to="/leave-approvals">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingLeaves?.data && pendingLeaves.data.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {pendingLeaves.data.map((leave: any) => (
                  <div key={leave.id} className="flex items-center justify-between p-2 bg-warning/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning text-xs font-medium">
                        {leave.profiles?.first_name?.[0]}{leave.profiles?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {leave.profiles?.first_name} {leave.profiles?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {leave.leave_type} • {format(new Date(leave.start_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {recentEmployees.map((employee) => {
                const isPresent = presentEmployeeIds.has(employee.id);
                return (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee.designation || 'N/A'}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs mt-1 ${isPresent ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
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
  );
};

export default AdminDashboard;

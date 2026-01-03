import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Clock, 
  Calendar, 
  Wallet, 
  Bell, 
  CheckCircle2, 
  XCircle, 
  Clock4,
  TrendingUp,
  CalendarDays,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const EmployeeDashboard: React.FC = () => {
  const { profile, user } = useAuth();

  // Fetch today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user?.id)
        .eq('date', today)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch leave balance
  const { data: leaveBalance } = useQuery({
    queryKey: ['leave-balance', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_balance')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recent leave requests
  const { data: recentLeaves } = useQuery({
    queryKey: ['recent-leaves', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleCheckIn = async () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    await supabase.from('attendance').insert({
      user_id: user?.id,
      date: today,
      check_in: now,
      status: 'present',
    });
  };

  const handleCheckOut = async () => {
    if (!todayAttendance) return;
    
    const now = new Date().toISOString();
    const checkIn = new Date(todayAttendance.check_in!);
    const checkOut = new Date(now);
    const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    
    await supabase
      .from('attendance')
      .update({
        check_out: now,
        total_hours: Math.round(hours * 100) / 100,
        status: hours < 4 ? 'half_day' : 'present',
      })
      .eq('id', todayAttendance.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const totalLeaveBalance = (leaveBalance?.paid_leave || 0) + 
    (leaveBalance?.sick_leave || 0) + 
    (leaveBalance?.casual_leave || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Status
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {todayAttendance?.status || 'Not checked in'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayAttendance?.check_in 
                ? `Checked in at ${new Date(todayAttendance.check_in).toLocaleTimeString()}`
                : 'No check-in recorded'
              }
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leave Balance
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeaveBalance} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid: {leaveBalance?.paid_leave || 0} | Sick: {leaveBalance?.sick_leave || 0} | Casual: {leaveBalance?.casual_leave || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
            <Clock4 className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentLeaves?.filter(l => l.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Leave requests awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unread notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Attendance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/profile">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <User className="h-5 w-5" />
                <span className="text-xs">My Profile</span>
              </Button>
            </Link>
            <Link to="/attendance">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-xs">Attendance</span>
              </Button>
            </Link>
            <Link to="/leave">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-xs">Apply Leave</span>
              </Button>
            </Link>
            <Link to="/payroll">
              <Button variant="outline" className="w-full h-20 flex-col gap-2">
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Payroll</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Mark your attendance for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="text-4xl font-bold text-primary">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-3">
                {!todayAttendance?.check_in ? (
                  <Button onClick={handleCheckIn} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Check In
                  </Button>
                ) : !todayAttendance?.check_out ? (
                  <Button onClick={handleCheckOut} variant="secondary" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Check Out
                  </Button>
                ) : (
                  <div className="text-center">
                    <Badge className="bg-success text-success-foreground mb-2">Completed</Badge>
                    <p className="text-sm text-muted-foreground">
                      Total hours: {todayAttendance.total_hours?.toFixed(1)}h
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>Your latest leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeaves && recentLeaves.length > 0 ? (
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{leave.leave_type} Leave</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(leave.status || 'pending')}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No leave requests yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Recent updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            {notifications && notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No new notifications</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;

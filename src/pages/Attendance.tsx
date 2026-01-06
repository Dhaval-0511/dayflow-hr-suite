import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar as CalendarIcon,
  TrendingUp,
  Loader2,
  User,
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Attendance: React.FC = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const isAdminOrHR = role === 'admin' || role === 'hr';

  const targetUserId = isAdminOrHR && selectedEmployee ? selectedEmployee : user?.id;

  // Fetch attendance for the month
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', targetUserId, selectedMonth],
    queryFn: async () => {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });
      
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Fetch employees for admin
  const { data: employees } = useQuery({
    queryKey: ['employees-attendance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id, department')
        .eq('is_active', true)
        .order('first_name');
      return data || [];
    },
    enabled: isAdminOrHR,
  });

  // Fetch selected employee profile
  const { data: selectedEmployeeProfile } = useQuery({
    queryKey: ['employee-profile', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId && isAdminOrHR,
  });

  // Today's attendance
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendanceData?.find(a => a.date === today);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('attendance').insert({
        user_id: user?.id,
        date: today,
        check_in: now,
        status: 'present',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Checked In', description: 'Your attendance has been recorded.' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance-details'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance-all'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance) return;
      
      const now = new Date().toISOString();
      const checkIn = new Date(todayAttendance.check_in!);
      const checkOut = new Date(now);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      
      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: now,
          total_hours: Math.round(hours * 100) / 100,
          status: hours < 4 ? 'half_day' : 'present',
        })
        .eq('id', todayAttendance.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Checked Out', description: 'Your attendance has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance-details'] });
      queryClient.invalidateQueries({ queryKey: ['today-attendance-all'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-success text-success-foreground">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'half_day':
        return <Badge className="bg-warning text-warning-foreground">Half Day</Badge>;
      case 'leave':
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Calculate stats
  const stats = {
    present: attendanceData?.filter(a => a.status === 'present').length || 0,
    absent: attendanceData?.filter(a => a.status === 'absent').length || 0,
    halfDay: attendanceData?.filter(a => a.status === 'half_day').length || 0,
    leave: attendanceData?.filter(a => a.status === 'leave').length || 0,
    totalHours: attendanceData?.reduce((acc, a) => acc + (a.total_hours || 0), 0) || 0,
  };

  // Calendar modifiers for highlighting
  const presentDays = attendanceData?.filter(a => a.status === 'present').map(a => new Date(a.date)) || [];
  const absentDays = attendanceData?.filter(a => a.status === 'absent').map(a => new Date(a.date)) || [];
  const leaveDays = attendanceData?.filter(a => a.status === 'leave').map(a => new Date(a.date)) || [];
  const halfDays = attendanceData?.filter(a => a.status === 'half_day').map(a => new Date(a.date)) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track and manage attendance</p>
        </div>
        {isAdminOrHR && (
          <Select value={selectedEmployee || ''} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-72">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select employee to view attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">My Attendance</SelectItem>
              {employees?.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Selected Employee Info (for HR) */}
      {isAdminOrHR && selectedEmployee && selectedEmployeeProfile && (
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {selectedEmployeeProfile.first_name?.[0]}{selectedEmployeeProfile.last_name?.[0]}
              </div>
              <div>
                <h3 className="font-semibold">{selectedEmployeeProfile.first_name} {selectedEmployeeProfile.last_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployeeProfile.designation} • {selectedEmployeeProfile.department} • {selectedEmployeeProfile.employee_id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Check-in/out for employees (only show for own attendance) */}
      {(!isAdminOrHR || !selectedEmployee) && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
            <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayAttendance?.check_in 
                      ? `Checked in at ${new Date(todayAttendance.check_in).toLocaleTimeString()}`
                      : 'Not checked in yet'
                    }
                  </p>
                  {todayAttendance?.check_out && (
                    <p className="text-sm text-muted-foreground">
                      Checked out at {new Date(todayAttendance.check_out).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                {!todayAttendance?.check_in ? (
                  <Button 
                    onClick={() => checkInMutation.mutate()} 
                    className="gap-2"
                    disabled={checkInMutation.isPending}
                    size="lg"
                  >
                    {checkInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Check In
                  </Button>
                ) : !todayAttendance?.check_out ? (
                  <Button 
                    onClick={() => checkOutMutation.mutate()} 
                    variant="secondary" 
                    className="gap-2"
                    disabled={checkOutMutation.isPending}
                    size="lg"
                  >
                    {checkOutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Check Out
                  </Button>
                ) : (
                  <div className="text-center">
                    <Badge className="bg-success text-success-foreground text-base px-4 py-2">Day Complete</Badge>
                    <p className="text-sm text-muted-foreground mt-2">
                      Total: {todayAttendance.total_hours?.toFixed(1)} hours
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.halfDay}</p>
                <p className="text-sm text-muted-foreground">Half Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <CalendarIcon className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.leave}</p>
                <p className="text-sm text-muted-foreground">Leave Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
                <p className="text-sm text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar and Table */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>{format(selectedMonth, 'MMMM yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              className="rounded-md"
              modifiers={{
                present: presentDays,
                absent: absentDays,
                leave: leaveDays,
                halfDay: halfDays,
              }}
              modifiersStyles={{
                present: { backgroundColor: 'hsl(var(--success) / 0.2)', color: 'hsl(var(--success))' },
                absent: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' },
                leave: { backgroundColor: 'hsl(var(--info) / 0.2)', color: 'hsl(var(--info))' },
                halfDay: { backgroundColor: 'hsl(var(--warning) / 0.2)', color: 'hsl(var(--warning))' },
              }}
            />
            <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span>Half Day</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-info" />
                <span>Leave</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <CardDescription>
              {format(selectedMonth, 'MMMM yyyy')} - Day wise breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : attendanceData && attendanceData.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {format(new Date(record.date), 'EEE, MMM d')}
                        </TableCell>
                        <TableCell>
                          {record.check_in 
                            ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {record.check_out 
                            ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No attendance records for this month</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;

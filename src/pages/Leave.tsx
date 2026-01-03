import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type LeaveType = Database['public']['Enums']['leave_type'];

const Leave: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: 'paid' as LeaveType,
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Fetch leave requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['leave-requests', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      return data || [];
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

  const createLeaveMutation = useMutation({
    mutationFn: async (leaveData: typeof newLeave) => {
      const { error } = await supabase.from('leave_requests').insert({
        user_id: user?.id,
        leave_type: leaveData.leave_type,
        start_date: leaveData.start_date,
        end_date: leaveData.end_date,
        reason: leaveData.reason,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Leave Request Submitted', description: 'Your request is pending approval.' });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      setIsDialogOpen(false);
      setNewLeave({ leave_type: 'paid', start_date: '', end_date: '', reason: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: LeaveType) => {
    const colors = {
      paid: 'bg-primary/10 text-primary',
      sick: 'bg-warning/10 text-warning',
      casual: 'bg-info/10 text-info',
      unpaid: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[type]} variant="secondary">{type.toUpperCase()}</Badge>;
  };

  const calculateDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  const handleSubmit = () => {
    if (!newLeave.start_date || !newLeave.end_date) {
      toast({ title: 'Error', description: 'Please select both start and end dates.', variant: 'destructive' });
      return;
    }
    if (new Date(newLeave.end_date) < new Date(newLeave.start_date)) {
      toast({ title: 'Error', description: 'End date must be after start date.', variant: 'destructive' });
      return;
    }
    createLeaveMutation.mutate(newLeave);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Apply and track your leave requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Fill in the details for your leave request.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={newLeave.leave_type}
                  onValueChange={(value: LeaveType) => setNewLeave({ ...newLeave, leave_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid Leave ({leaveBalance?.paid_leave || 0} available)</SelectItem>
                    <SelectItem value="sick">Sick Leave ({leaveBalance?.sick_leave || 0} available)</SelectItem>
                    <SelectItem value="casual">Casual Leave ({leaveBalance?.casual_leave || 0} available)</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newLeave.start_date}
                    onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newLeave.end_date}
                    onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                  />
                </div>
              </div>
              {newLeave.start_date && newLeave.end_date && (
                <p className="text-sm text-muted-foreground">
                  Duration: {calculateDays(newLeave.start_date, newLeave.end_date)} day(s)
                </p>
              )}
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Enter reason for leave..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createLeaveMutation.isPending}>
                {createLeaveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balance */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-primary">{leaveBalance?.paid_leave || 0}</p>
                <p className="text-sm text-muted-foreground">Paid Leave</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-warning">{leaveBalance?.sick_leave || 0}</p>
                <p className="text-sm text-muted-foreground">Sick Leave</p>
              </div>
              <div className="p-2 rounded-lg bg-warning/10">
                <CalendarDays className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-info">{leaveBalance?.casual_leave || 0}</p>
                <p className="text-sm text-muted-foreground">Casual Leave</p>
              </div>
              <div className="p-2 rounded-lg bg-info/10">
                <CalendarDays className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{leaveBalance?.unpaid_leave || 0}</p>
                <p className="text-sm text-muted-foreground">Unpaid Leave</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Your leave application history</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : leaveRequests && leaveRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>{getLeaveTypeBadge(leave.leave_type)}</TableCell>
                    <TableCell>{format(new Date(leave.start_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{format(new Date(leave.end_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{calculateDays(leave.start_date, leave.end_date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{leave.reason || '-'}</TableCell>
                    <TableCell>{getStatusBadge(leave.status)}</TableCell>
                    <TableCell>{format(new Date(leave.created_at!), 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No leave requests yet</p>
              <p className="text-sm">Click "Apply Leave" to submit your first request</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leave;

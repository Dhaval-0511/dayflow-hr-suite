import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardCheck, 
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  User,
  Clock,
  Search
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Input } from '@/components/ui/input';

const LeaveApprovals: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all leave requests
  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['all-leave-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          profiles:user_id (first_name, last_name, employee_id, department, designation)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'approved' | 'rejected');
      }

      const { data } = await query;
      return data || [];
    },
  });

  // Filter by search
  const filteredRequests = leaveRequests?.filter((request: any) => {
    const fullName = `${request.profiles?.first_name} ${request.profiles?.last_name}`.toLowerCase();
    const employeeId = request.profiles?.employee_id?.toLowerCase() || '';
    return fullName.includes(searchQuery.toLowerCase()) || 
           employeeId.includes(searchQuery.toLowerCase());
  });

  const reviewLeaveMutation = useMutation({
    mutationFn: async ({ id, status, userId, leaveType, startDate, endDate }: { 
      id: string; 
      status: 'approved' | 'rejected';
      userId: string;
      leaveType: string;
      startDate: string;
      endDate: string;
    }) => {
      // Update leave request status
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment,
        })
        .eq('id', id);
      
      if (updateError) throw updateError;

      // If approved, deduct from leave balance
      if (status === 'approved') {
        const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
        
        // Get current leave balance
        const { data: balance } = await supabase
          .from('leave_balance')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (balance) {
          const leaveColumn = `${leaveType}_leave` as 'paid_leave' | 'sick_leave' | 'casual_leave' | 'unpaid_leave';
          const currentBalance = (balance as any)[leaveColumn] || 0;
          const newBalance = Math.max(0, currentBalance - days);

          const { error: balanceError } = await supabase
            .from('leave_balance')
            .update({ [leaveColumn]: newBalance })
            .eq('user_id', userId);

          if (balanceError) throw balanceError;
        }

        // Mark attendance as leave for those days
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          
          // Check if attendance record exists
          const { data: existing } = await supabase
            .from('attendance')
            .select('id')
            .eq('user_id', userId)
            .eq('date', dateStr)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('attendance')
              .update({ status: 'leave' })
              .eq('id', existing.id);
          } else {
            await supabase
              .from('attendance')
              .insert({
                user_id: userId,
                date: dateStr,
                status: 'leave',
              });
          }
        }
      }

      // Create notification for the employee
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: status === 'approved' 
            ? `Your ${leaveType} leave request from ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d')} has been approved.${reviewComment ? ` Comment: ${reviewComment}` : ''}`
            : `Your ${leaveType} leave request from ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d')} has been rejected.${reviewComment ? ` Reason: ${reviewComment}` : ''}`,
          type: status === 'approved' ? 'success' : 'error',
        });

      if (notifError) console.error('Notification error:', notifError);
    },
    onSuccess: (_, { status }) => {
      toast({ 
        title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`, 
        description: status === 'approved' 
          ? 'The leave has been approved and balance updated.' 
          : 'The leave request has been rejected.'
      });
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['pending-leaves-dashboard'] });
      setIsDialogOpen(false);
      setReviewComment('');
      setSelectedRequest(null);
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

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-primary/10 text-primary',
      sick: 'bg-warning/10 text-warning',
      casual: 'bg-info/10 text-info',
      unpaid: 'bg-muted text-muted-foreground',
    };
    return <Badge className={colors[type] || colors.unpaid} variant="secondary">{type.toUpperCase()}</Badge>;
  };

  const calculateDays = (start: string, end: string) => {
    return differenceInDays(new Date(end), new Date(start)) + 1;
  };

  const handleReview = (request: any) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    reviewLeaveMutation.mutate({
      id: selectedRequest.id,
      status: 'approved',
      userId: selectedRequest.user_id,
      leaveType: selectedRequest.leave_type,
      startDate: selectedRequest.start_date,
      endDate: selectedRequest.end_date,
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    reviewLeaveMutation.mutate({
      id: selectedRequest.id,
      status: 'rejected',
      userId: selectedRequest.user_id,
      leaveType: selectedRequest.leave_type,
      startDate: selectedRequest.start_date,
      endDate: selectedRequest.end_date,
    });
  };

  const pendingCount = leaveRequests?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Approvals</h1>
          <p className="text-muted-foreground">Review and manage leave requests</p>
        </div>
        <div className="flex items-center gap-4">
          {pendingCount > 0 && (
            <Badge className="bg-warning text-warning-foreground px-4 py-2">
              <Clock className="h-4 w-4 mr-2" />
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request: any) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          {request.profiles?.first_name?.[0]}{request.profiles?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {request.profiles?.first_name} {request.profiles?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.profiles?.department}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getLeaveTypeBadge(request.leave_type)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(request.start_date), 'MMM d')}</p>
                        <p className="text-muted-foreground">to {format(new Date(request.end_date), 'MMM d, yyyy')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {calculateDays(request.start_date, request.end_date)} days
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {request.reason || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {request.status === 'pending' ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleReview(request)}
                        >
                          Review
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {request.reviewed_at 
                            ? format(new Date(request.reviewed_at), 'MMM d')
                            : '-'
                          }
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No leave requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Leave Request</DialogTitle>
            <DialogDescription>
              Approve or reject this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {selectedRequest.profiles?.first_name?.[0]}{selectedRequest.profiles?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedRequest.profiles?.first_name} {selectedRequest.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.profiles?.designation} • {selectedRequest.profiles?.department}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Leave Type</Label>
                  <p className="font-medium capitalize">{selectedRequest.leave_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="font-medium">
                    {calculateDays(selectedRequest.start_date, selectedRequest.end_date)} day(s)
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.start_date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.end_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {selectedRequest.reason && (
                <div>
                  <Label className="text-xs text-muted-foreground">Reason</Label>
                  <p className="font-medium">{selectedRequest.reason}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Review Comments (Optional)</Label>
                <Textarea
                  placeholder="Add any comments for this decision..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={reviewLeaveMutation.isPending}
            >
              {reviewLeaveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
            <Button 
              className="bg-success hover:bg-success/90"
              onClick={handleApprove}
              disabled={reviewLeaveMutation.isPending}
            >
              {reviewLeaveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveApprovals;

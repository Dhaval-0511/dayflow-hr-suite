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
  Clock
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const LeaveApprovals: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
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

  const reviewLeaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ 
        title: `Leave ${status === 'approved' ? 'Approved' : 'Rejected'}`, 
        description: 'The leave request has been updated.' 
      });
      queryClient.invalidateQueries({ queryKey: ['all-leave-requests'] });
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
      </div>

      {/* Leave Requests Table */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : leaveRequests && leaveRequests.length > 0 ? (
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
                {leaveRequests.map((request: any) => (
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
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-success hover:text-success hover:bg-success/10"
                            onClick={() => handleReview(request)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleReview(request)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => reviewLeaveMutation.mutate({ 
                id: selectedRequest?.id, 
                status: 'rejected' 
              })}
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
              onClick={() => reviewLeaveMutation.mutate({ 
                id: selectedRequest?.id, 
                status: 'approved' 
              })}
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

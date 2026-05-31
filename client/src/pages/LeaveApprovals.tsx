import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, LeaveRequest } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const LEAVE_TYPE_STYLE: Record<string, string> = {
  'paid time off': 'bg-purple-500/20 text-purple-400',
  'sick leave': 'bg-orange-500/20 text-orange-400',
  'unpaid leave': 'bg-gray-500/20 text-gray-400',
};

const calcDays = (start: string, end: string) => {
  const s = new Date(start), e = new Date(end);
  let count = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
};

const LeaveApprovals: React.FC = () => {
  const { role } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [actionId, setActionId] = useState<string | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [openComment, setOpenComment] = useState<string | null>(null);

  const isAdmin = role === 'admin' || role === 'hr' || role === 'super_admin';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLeave();
      setLeaves(data);
    } catch { toast.error('Failed to load leave requests'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionId(id);
    try {
      await api.updateLeaveStatus(id, status, commentMap[id]);
      toast.success(`Leave ${status}`);
      setOpenComment(null);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setActionId(null); }
  };

  if (!isAdmin) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Leave Approvals are only available to Admin and HR Officers.
    </div>
  );

  const filtered = leaves.filter(l => filter === 'all' || l.status === filter);
  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leave Approvals</h1>
          <p className="text-sm text-muted-foreground">Review and manage employee leave requests</p>
        </div>
        {counts.pending > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {counts.pending} pending
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded text-xs font-medium capitalize transition-all ${filter === tab ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Clock className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No {filter === 'all' ? '' : filter} leave requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(leave => {
            const days = calcDays(leave.startDate, leave.endDate);
            return (
              <div key={leave.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <div className="p-4 flex items-start justify-between gap-4">
                  {/* Left: Employee & Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold border border-border">
                        {leave.firstName?.[0]}{leave.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{leave.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} →{' '}
                          {new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="ml-2 font-medium text-foreground">{days} day{days !== 1 ? 's' : ''}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${LEAVE_TYPE_STYLE[leave.leaveType?.toLowerCase()] || 'bg-muted text-muted-foreground'}`}>
                        {leave.leaveType}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium capitalize ${STATUS_STYLE[leave.status]}`}>
                        {leave.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(leave.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {leave.remarks && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border border-border/50">"{leave.remarks}"</p>
                    )}
                    {leave.adminComment && (
                      <p className="text-xs text-blue-400 bg-blue-500/10 rounded p-2 border border-blue-500/20">💬 {leave.adminComment}</p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {leave.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[120px]">
                      <Button size="sm" onClick={() => handleAction(leave.id, 'approved')}
                        disabled={actionId === leave.id}
                        className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1">
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" onClick={() => handleAction(leave.id, 'rejected')}
                        disabled={actionId === leave.id}
                        className="h-7 text-xs bg-red-600/80 hover:bg-red-700 text-white gap-1">
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                      <button onClick={() => setOpenComment(openComment === leave.id ? null : leave.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                        <ChevronDown className={`h-3 w-3 transition-transform ${openComment === leave.id ? 'rotate-180' : ''}`} />
                        Add comment
                      </button>
                    </div>
                  )}
                </div>

                {/* Comment input (collapsible) */}
                {openComment === leave.id && (
                  <div className="border-t border-border px-4 py-3 bg-muted/20">
                    <textarea
                      value={commentMap[leave.id] || ''}
                      onChange={e => setCommentMap(prev => ({ ...prev, [leave.id]: e.target.value }))}
                      placeholder="Optional comment for the employee..."
                      className="w-full text-xs bg-background border border-input rounded p-2 resize-none h-16 text-foreground"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaveApprovals;

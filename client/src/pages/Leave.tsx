import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, LeaveRequest, LeaveAllocation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Check, X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const NewLeaveDialog: React.FC<{ open: boolean; onClose: () => void; onCreated: () => void }> = ({
  open, onClose, onCreated
}) => {
  const [form, setForm] = useState({ leaveType: 'Paid Time Off', startDate: '', endDate: '', remarks: '', attachment: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (!form.startDate || !form.endDate) { setError('Please select dates.'); return; }
    if (form.endDate < form.startDate) { setError('End date must be after start date.'); return; }
    setLoading(true);
    try {
      await api.createLeave(form);
      onCreated();
      onClose();
      setForm({ leaveType: 'Paid Time Off', startDate: '', endDate: '', remarks: '', attachment: '' });
    } catch (err: unknown) { setError((err as Error).message); }
    setLoading(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadFile(file, 'hrms/leave-attachments');
      setForm(p => ({ ...p, attachment: url }));
      toast.success('Attachment uploaded!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Time Off Request</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Time Off Type</Label>
            <Select value={form.leaveType} onValueChange={v => setForm(p => ({ ...p, leaveType: v }))}>
              <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Paid Time Off">Paid Time Off</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Unpaid Leave">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Remarks</Label>
            <textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
              className="w-full mt-1 text-sm bg-transparent border border-border rounded p-2 min-h-[60px] resize-none focus:outline-none focus:border-purple-400" />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" />Attachment (for sick leave)</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="file" accept="image/*,application/pdf" onChange={handleFile} disabled={uploading} className="text-xs flex-1" />
              {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {form.attachment && <p className="text-xs text-green-400 mt-1">✓ File uploaded to Cloudinary</p>}
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 h-8 text-xs">Discard</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700">
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Leave: React.FC = () => {
  const { user, role } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [commentModal, setCommentModal] = useState<{ id: string; action: string } | null>(null);
  const [comment, setComment] = useState('');
  const isAdmin = role === 'admin' || role === 'hr' || role === 'super_admin';

  const load = useCallback(async () => {
    try {
      const [l, a] = await Promise.all([api.getLeave(), api.getLeaveAllocations()]);
      setLeaves(l);
      setAllocations(a);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const myAlloc = allocations.find(a => a.employeeId === user?.id) || { paidLeave: 24, sickLeave: 7, unpaidLeave: 999 };
  const myLeaves = isAdmin ? leaves : leaves.filter(l => l.employeeId === user?.id);
  const approvedMine = leaves.filter(l => l.employeeId === user?.id && l.status === 'approved');
  const paidUsed = approvedMine.filter(l => l.leaveType === 'Paid Time Off').reduce((s, l) => {
    const diff = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1;
    return s + diff;
  }, 0);
  const sickUsed = approvedMine.filter(l => l.leaveType === 'Sick Leave').reduce((s, l) => {
    const diff = Math.ceil((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1;
    return s + diff;
  }, 0);

  const handleStatusChange = async (id: string, status: string, adminComment?: string) => {
    try {
      await api.updateLeaveStatus(id, status, adminComment);
      load();
    } catch (err: unknown) { alert((err as Error).message); }
  };

  const filteredLeaves = myLeaves.filter(l =>
    (l.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
    l.leaveType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Time Off</h1>
          <p className="text-sm text-muted-foreground">Manage leave requests and approvals</p>
        </div>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          {isAdmin && <TabsTrigger value="allocation">Allocation</TabsTrigger>}
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          {/* Leave balance */}
          <div className="flex gap-4">
            <div className="border border-purple-500/30 rounded-lg px-4 py-2 text-center min-w-[100px]">
              <p className="text-lg font-bold text-purple-400">{Math.max(0, myAlloc.paidLeave - paidUsed)}</p>
              <p className="text-xs text-muted-foreground">Paid Time Off</p>
            </div>
            <div className="border border-blue-500/30 rounded-lg px-4 py-2 text-center min-w-[100px]">
              <p className="text-lg font-bold text-blue-400">{Math.max(0, myAlloc.sickLeave - sickUsed)}</p>
              <p className="text-xs text-muted-foreground">Sick Leave</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button size="sm" onClick={() => setShowNew(true)}
              className="bg-purple-600 hover:bg-purple-700 text-xs h-8">
              <Plus className="h-3.5 w-3.5 mr-1" />NEW
            </Button>
            {isAdmin && (
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="h-8 text-xs flex-1" />
            )}
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {(isAdmin ? ['Employee', 'Start Date', 'End Date', 'Type', 'Status', 'Actions'] : ['Start Date', 'End Date', 'Type', 'Status']).map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeaves.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No leave requests found</td></tr>
                ) : filteredLeaves.map(l => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    {isAdmin && (
                      <td className="px-4 py-2.5 font-medium text-sm">{l.employeeName}</td>
                    )}
                    <td className="px-4 py-2.5 text-sm font-mono">{new Date(l.startDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-sm font-mono">{new Date(l.endDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-purple-400">{l.leaveType}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${statusColor[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        {l.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => setCommentModal({ id: l.id, action: 'approved' })}
                              className="w-7 h-7 rounded bg-green-500/20 text-green-400 border border-green-500/30 flex items-center justify-center hover:bg-green-500/30">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setCommentModal({ id: l.id, action: 'rejected' })}
                              className="w-7 h-7 rounded bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center hover:bg-red-500/30">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {l.adminComment && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[120px] truncate" title={l.adminComment}>{l.adminComment}</p>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="allocation" className="space-y-4 mt-4">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['Employee', 'Paid Leave', 'Sick Leave', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allocations.map(alloc => (
                    <AllocationRow key={alloc.employeeId} alloc={alloc} onSave={load} />
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Comment modal */}
      {commentModal && (
        <Dialog open onOpenChange={() => setCommentModal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{commentModal.action === 'approved' ? 'Approve' : 'Reject'} Leave Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Comment (optional)</Label>
                <textarea value={comment} onChange={e => setComment(e.target.value)}
                  className="w-full mt-1 text-sm bg-transparent border border-border rounded p-2 min-h-[80px] resize-none focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCommentModal(null)} className="flex-1 h-8">Cancel</Button>
                <Button
                  onClick={() => { handleStatusChange(commentModal.id, commentModal.action, comment); setCommentModal(null); setComment(''); }}
                  className={`flex-1 h-8 ${commentModal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {commentModal.action === 'approved' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <NewLeaveDialog open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
    </div>
  );
};

const AllocationRow: React.FC<{ alloc: LeaveAllocation; onSave: () => void }> = ({ alloc, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [paid, setPaid] = useState(String(alloc.paidLeave));
  const [sick, setSick] = useState(String(alloc.sickLeave));

  const save = async () => {
    try {
      await api.updateLeaveAllocation(alloc.employeeId, { paidLeave: parseInt(paid), sickLeave: parseInt(sick), unpaidLeave: 999 });
      setEditing(false); onSave();
    } catch {}
  };

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-2.5 font-medium text-sm">{alloc.employeeName}</td>
      <td className="px-4 py-2.5">
        {editing ? <Input value={paid} onChange={e => setPaid(e.target.value)} type="number" className="h-7 w-16 text-sm" /> : <span>{alloc.paidLeave} days</span>}
      </td>
      <td className="px-4 py-2.5">
        {editing ? <Input value={sick} onChange={e => setSick(e.target.value)} type="number" className="h-7 w-16 text-sm" /> : <span>{alloc.sickLeave} days</span>}
      </td>
      <td className="px-4 py-2.5">
        {editing
          ? <div className="flex gap-1"><Button size="sm" onClick={save} className="h-6 text-xs bg-purple-600 hover:bg-purple-700 px-2">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-6 text-xs px-2">Cancel</Button></div>
          : <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-6 text-xs px-2">Edit</Button>
        }
      </td>
    </tr>
  );
};

export default Leave;

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const DEPARTMENTS = ['Engineering', 'Design', 'Human Resources', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT', 'Legal'];
const ROLES = ['employee', 'hr', 'admin'];

const AddEmployeeDialog: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    department: '', jobPosition: '', location: '', role: 'employee', monthlyWage: '',
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ loginId: string; generatedPassword: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  if (!open) return null;

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name and email are required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.createEmployee({
        ...form,
        monthlyWage: parseFloat(form.monthlyWage) || 0,
      });
      setResult({ loginId: res.loginId, generatedPassword: res.generatedPassword });
      toast.success('Employee created successfully!');
      onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm({ firstName: '', lastName: '', email: '', phone: '', department: '', jobPosition: '', location: '', role: 'employee', monthlyWage: '' });
    setResult(null);
    onClose();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded-lg"><UserPlus className="h-4 w-4 text-purple-400" /></div>
            <h2 className="font-semibold">Add New Employee</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎉</span>
              </div>
              <p className="font-semibold text-lg">Employee Created!</p>
              <p className="text-sm text-muted-foreground mt-1">Share these credentials with the new employee</p>
            </div>
            <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Login ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded-lg border border-border text-purple-400">{result.loginId}</code>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => copyToClipboard(result.loginId, 'Login ID')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded-lg border border-border text-green-400">
                    {showPw ? result.generatedPassword : '••••••••'}
                  </code>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => copyToClipboard(result.generatedPassword, 'Password')}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              ⚠️ A welcome email has been sent. Employee must change password after first login.
            </p>
            <Button onClick={handleClose} className="w-full bg-purple-600 hover:bg-purple-700">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input value={form.firstName} onChange={e => set('firstName', e.target.value)} className="mt-1 h-8 text-sm" placeholder="John" required />
              </div>
              <div>
                <Label className="text-xs">Last Name *</Label>
                <Input value={form.lastName} onChange={e => set('lastName', e.target.value)} className="mt-1 h-8 text-sm" placeholder="Doe" required />
              </div>
            </div>
            <div>
              <Label className="text-xs">Work Email *</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1 h-8 text-sm" placeholder="john@company.com" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1 h-8 text-sm" placeholder="+91 98765..." />
              </div>
              <div>
                <Label className="text-xs">Role</Label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="mt-1 w-full h-8 text-sm px-2 rounded-md border border-input bg-background text-foreground capitalize">
                  {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Job Position</Label>
                <Input value={form.jobPosition} onChange={e => set('jobPosition', e.target.value)} className="mt-1 h-8 text-sm" placeholder="Software Engineer" />
              </div>
              <div>
                <Label className="text-xs">Department</Label>
                <select value={form.department} onChange={e => set('department', e.target.value)}
                  className="mt-1 w-full h-8 text-sm px-2 rounded-md border border-input bg-background text-foreground">
                  <option value="">Select dept...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={e => set('location', e.target.value)} className="mt-1 h-8 text-sm" placeholder="Mumbai" />
              </div>
              <div>
                <Label className="text-xs">Monthly Wage (₹)</Label>
                <Input type="number" value={form.monthlyWage} onChange={e => set('monthlyWage', e.target.value)} className="mt-1 h-8 text-sm" placeholder="50000" min="0" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1 h-9 text-sm">Cancel</Button>
              <Button type="submit" disabled={saving} className="flex-1 h-9 text-sm bg-purple-600 hover:bg-purple-700">
                {saving ? 'Creating...' : 'Create Employee'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddEmployeeDialog;

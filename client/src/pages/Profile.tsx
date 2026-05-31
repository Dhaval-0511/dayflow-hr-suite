import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, Employee, computeSalaryComponents } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, Save, X, Camera, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type SalaryInfo = {
  monthlyWage: number;
  workingDaysPerWeek: number;
  breakTimeHrs: number;
};

const FieldRow: React.FC<{
  label: string; value: string; editMode: boolean;
  field: string; onChange: (k: string, v: string) => void; type?: string;
}> = ({ label, value, editMode, field, onChange, type = 'text' }) => (
  <div className="flex flex-col gap-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {editMode
      ? <Input type={type} value={value} onChange={e => onChange(field, e.target.value)} className="h-7 text-sm" />
      : <p className="text-sm border-b border-border pb-1 min-h-[28px]">{value || '—'}</p>
    }
  </div>
);

const SalaryInfoTab: React.FC<{ emp: Employee; isAdmin: boolean }> = ({ emp, isAdmin }) => {
  const [salInfo, setSalInfo] = useState<SalaryInfo>({
    monthlyWage: Number(emp.monthlyWage) || 0,
    workingDaysPerWeek: emp.workingDaysPerWeek || 5,
    breakTimeHrs: Number(emp.breakTimeHrs) || 1,
  });
  const [editing, setEditing] = useState(false);
  const [wage, setWage] = useState(String(salInfo.monthlyWage));
  const [saved, setSaved] = useState(false);

  const w = parseFloat(wage) || 0;
  const c = computeSalaryComponents(w);

  const handleSave = async () => {
    try {
      await api.updatePayroll(emp.id, { monthlyWage: w });
      setSalInfo(p => ({ ...p, monthlyWage: w }));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <Label className="text-xs text-muted-foreground">Month Wage</Label>
            <div className="flex items-center gap-2">
              {editing
                ? <Input value={wage} onChange={e => setWage(e.target.value)} type="number" className="h-7 w-32 text-sm" />
                : <p className="text-xl font-semibold">{w.toLocaleString('en-IN')}</p>
              }
              <span className="text-sm text-muted-foreground">/ Month</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Yearly wage</Label>
            <p className="text-xl font-semibold">{(w * 12).toLocaleString('en-IN')}</p>
            <span className="text-xs text-muted-foreground">/ Yearly</span>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 items-center">
            {editing
              ? <>
                  <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"><Save className="h-3 w-3 mr-1" />Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-7 text-xs">Cancel</Button>
                </>
              : <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="h-7 text-xs"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
            }
            {saved && <span className="text-green-400 text-xs">Saved!</span>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-semibold text-sm border-b pb-1">Salary Components</h3>
          {[
            { name: 'Basic Salary', amount: c.basic, pct: c.basicPct, note: '50% of monthly wage' },
            { name: 'House Rent Allowance', amount: c.hra, pct: c.hraPct, note: '50% of basic salary' },
            { name: 'Standard Allowance', amount: c.standardAllowance, pct: c.standardAllowancePct, note: 'Fixed 16.67% of wage' },
            { name: 'Performance Bonus', amount: c.perf, pct: c.perfPct, note: '8.33% of basic salary' },
            { name: 'Leave Travel Allowance', amount: c.lta, pct: c.ltaPct, note: '8.33% of basic salary' },
            { name: 'Fixed Allowance', amount: c.fixed, pct: c.fixedPct, note: 'Wage minus all components' },
          ].map(item => (
            <div key={item.name} className="border-b border-border/50 pb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.name}</span>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-purple-400">{fmt(item.amount)}</span>
                  <span className="text-muted-foreground text-xs">₹ / month</span>
                  <Badge variant="outline" className="text-[10px] px-1">{item.pct.toFixed(2)}%</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm border-b pb-1">Working Schedule</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground text-xs">Working days/week:</span><p>{salInfo.workingDaysPerWeek}</p></div>
              <div><span className="text-muted-foreground text-xs">Break time:</span><p>{salInfo.breakTimeHrs} hrs</p></div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm border-b pb-1">Provident Fund (PF) Contribution</h3>
            {[
              { label: 'Employee PF (12%)', amount: c.employeePf },
              { label: "Employer PF (12%)", amount: c.employerPf },
            ].map(pf => (
              <div key={pf.label} className="flex justify-between items-center border-b border-border/50 pb-1">
                <span className="text-sm">{pf.label}</span>
                <span className="text-sm text-purple-400">{fmt(pf.amount)} / month</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-sm border-b pb-1">Tax Deductions</h3>
            <div className="flex justify-between items-center border-b border-border/50 pb-1">
              <span className="text-sm">Professional Tax</span>
              <span className="text-sm text-purple-400">{fmt(c.profTax)} / month</span>
            </div>
          </div>
          <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5">
            <div className="flex justify-between">
              <span className="font-semibold text-sm">Net Pay</span>
              <span className="text-lg font-bold text-green-400">{fmt(c.netPay)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gross ({fmt(c.gross)}) - PF ({fmt(c.employeePf)}) - Prof Tax ({fmt(c.profTax)})</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SecurityTab: React.FC = () => {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    setErr(''); setMsg('');
    if (!form.current || !form.newPw) { setErr('All fields required'); return; }
    if (form.newPw !== form.confirm) { setErr('Passwords do not match'); return; }
    if (form.newPw.length < 6) { setErr('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.changePassword(form.current, form.newPw);
      setMsg('Password changed successfully!');
      setForm({ current: '', newPw: '', confirm: '' });
    } catch (e: unknown) { setErr((e as Error).message); }
    setLoading(false);
  };

  return (
    <div className="max-w-sm space-y-4">
      <h3 className="font-semibold text-sm">Change Password</h3>
      {[
        { label: 'Current Password', key: 'current' },
        { label: 'New Password', key: 'newPw' },
        { label: 'Confirm New Password', key: 'confirm' },
      ].map(f => (
        <div key={f.key}>
          <Label className="text-xs">{f.label}</Label>
          <Input type="password" value={form[f.key as keyof typeof form]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            className="mt-1 h-8 text-sm" />
        </div>
      ))}
      {err && <p className="text-red-400 text-xs">{err}</p>}
      {msg && <p className="text-green-400 text-xs">{msg}</p>}
      <Button onClick={handleChange} disabled={loading} className="bg-purple-600 hover:bg-purple-700 h-8 text-xs">
        {loading ? 'Saving...' : 'Change Password'}
      </Button>
    </div>
  );
};

const Profile: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, role, refreshUser } = useAuth();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Partial<Employee>>({});
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newCert, setNewCert] = useState('');

  const isAdmin = role === 'admin' || role === 'hr' || role === 'super_admin';
  const targetId = id || user?.id;
  const isSelf = targetId === user?.id;
  const canEdit = isAdmin || isSelf;

  useEffect(() => {
    const load = async () => {
      if (!targetId) return;
      try {
        const data = await api.getEmployee(targetId);
        setEmp(data);
        setEdits({});
      } catch {}
    };
    load();
  }, [targetId]);

  const handleChange = (key: string, val: string) => {
    setEdits(p => ({ ...p, [key]: val }));
  };

  const getVal = (key: keyof Employee) => {
    if (key in edits) return String(edits[key] ?? '');
    return String(emp?.[key] ?? '');
  };

  const handleSave = async () => {
    if (!emp) return;
    setSaving(true);
    try {
      const updated = await api.updateEmployee(emp.id, edits);
      setEmp(updated);
      setEdits({});
      setEditMode(false);
      if (isSelf) await refreshUser();
    } catch {}
    setSaving(false);
  };

  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { url } = await api.uploadFile(file, 'hrms/avatars');
      setEdits(p => ({ ...p, avatar: url }));
      toast.success('Avatar uploaded!');
    } catch (err: any) {
      toast.error('Avatar upload failed: ' + err.message);
    } finally {
      setAvatarUploading(false);
    }
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    const skills = [...(emp?.skills || []), newSkill.trim()];
    setEdits(p => ({ ...p, skills }));
    setNewSkill('');
    if (emp) setEmp({ ...emp, skills });
  };

  const removeSkill = (s: string) => {
    const skills = (emp?.skills || []).filter(x => x !== s);
    setEdits(p => ({ ...p, skills }));
    if (emp) setEmp({ ...emp, skills });
  };

  const addCert = () => {
    if (!newCert.trim()) return;
    const certifications = [...(emp?.certifications || []), newCert.trim()];
    setEdits(p => ({ ...p, certifications }));
    setNewCert('');
    if (emp) setEmp({ ...emp, certifications });
  };

  const removeCert = (c: string) => {
    const certifications = (emp?.certifications || []).filter(x => x !== c);
    setEdits(p => ({ ...p, certifications }));
    if (emp) setEmp({ ...emp, certifications });
  };

  if (!emp) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading profile...</div>;

  const avatarDisplay = edits.avatar || emp.avatar;

  return (
    <div className="space-y-4 max-w-5xl">
      {id && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
      )}

      {/* Header */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-semibold text-base">{isSelf ? 'My Profile' : `${emp.firstName} ${emp.lastName}'s Profile`}</h2>
          {canEdit && (
            <div className="flex gap-2">
              {editMode
                ? <>
                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700 h-7 text-xs">
                      <Save className="h-3 w-3 mr-1" />{saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditMode(false); setEdits({}); }} className="h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />Cancel
                    </Button>
                  </>
                : <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="h-7 text-xs">
                    <Pencil className="h-3 w-3 mr-1" />Edit
                  </Button>
              }
            </div>
          )}
        </div>

        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden border-2 border-border">
              {avatarDisplay
                ? <img src={avatarDisplay} alt="" className="w-full h-full object-cover" />
                : `${emp.firstName?.[0]}${emp.lastName?.[0]}`
              }
            </div>
            {editMode && (
              <label className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center cursor-pointer hover:bg-purple-700 ${avatarUploading ? 'opacity-50' : ''}`}>
                {avatarUploading
                  ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                  : <Camera className="h-3 w-3 text-white" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 min-w-0">
            <div className="sm:col-span-2 lg:col-span-1">
              {editMode && isAdmin ? (
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs text-muted-foreground">First Name</Label>
                    <Input value={edits.firstName ?? emp.firstName} onChange={e => handleChange('firstName', e.target.value)} className="h-7 text-sm mt-0.5" /></div>
                  <div><Label className="text-xs text-muted-foreground">Last Name</Label>
                    <Input value={edits.lastName ?? emp.lastName} onChange={e => handleChange('lastName', e.target.value)} className="h-7 text-sm mt-0.5" /></div>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold">{emp.firstName} {emp.lastName}</p>
                  <p className="text-sm text-muted-foreground font-mono">{emp.loginId}</p>
                </div>
              )}
            </div>

            <FieldRow label="Job Position" value={getVal('jobPosition')} editMode={editMode && isAdmin} field="jobPosition" onChange={handleChange} />
            <FieldRow label="Email" value={getVal('email')} editMode={editMode && isAdmin} field="email" onChange={handleChange} type="email" />
            <FieldRow label="Mobile" value={getVal('phone')} editMode={editMode} field="phone" onChange={handleChange} />
            <FieldRow label="Department" value={getVal('department')} editMode={editMode && isAdmin} field="department" onChange={handleChange} />
            <FieldRow label="Manager ID" value={getVal('managerId')} editMode={editMode && isAdmin} field="managerId" onChange={handleChange} />
            <FieldRow label="Location" value={getVal('location')} editMode={editMode && isAdmin} field="location" onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resume">
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="private">Private Info</TabsTrigger>
          {isAdmin && <TabsTrigger value="salary">Salary Info</TabsTrigger>}
          {isSelf && <TabsTrigger value="security">Security</TabsTrigger>}
        </TabsList>

        <TabsContent value="resume" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4 space-y-4">
              {[
                { key: 'about', label: 'About' },
                { key: 'whatILove', label: 'What I love about my job' },
                { key: 'hobbies', label: 'My interests and hobbies' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="font-medium text-sm mb-1">{label}</p>
                  {editMode
                    ? <textarea value={getVal(key as keyof Employee)} onChange={e => handleChange(key, e.target.value)}
                        className="w-full text-sm bg-transparent border border-border rounded p-2 min-h-[60px] resize-none focus:outline-none focus:border-purple-400" />
                    : <p className="text-sm text-muted-foreground">{emp[key as keyof Employee] as string || 'Not provided'}</p>
                  }
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <p className="font-medium text-sm mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(emp.skills || []).map(s => (
                    <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-border bg-muted/50">
                      {s}
                      {editMode && <button onClick={() => removeSkill(s)} className="text-muted-foreground hover:text-red-400"><X className="h-2.5 w-2.5" /></button>}
                    </span>
                  ))}
                </div>
                {editMode && (
                  <div className="flex gap-1.5">
                    <Input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSkill()}
                      placeholder="Add skill..." className="h-7 text-xs flex-1" />
                    <Button size="sm" onClick={addSkill} className="h-7 px-2 bg-purple-600 hover:bg-purple-700"><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>

              <div className="border border-border rounded-lg p-4">
                <p className="font-medium text-sm mb-2">Certifications</p>
                <div className="space-y-1 mb-2">
                  {(emp.certifications || []).map(c => (
                    <div key={c} className="flex items-center justify-between text-sm py-1 border-b border-border/50">
                      <span>{c}</span>
                      {editMode && <button onClick={() => removeCert(c)} className="text-muted-foreground hover:text-red-400"><X className="h-3 w-3" /></button>}
                    </div>
                  ))}
                </div>
                {editMode && (
                  <div className="flex gap-1.5">
                    <Input value={newCert} onChange={e => setNewCert(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCert()}
                      placeholder="Add certification..." className="h-7 text-xs flex-1" />
                    <Button size="sm" onClick={addCert} className="h-7 px-2 bg-purple-600 hover:bg-purple-700"><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="private" className="mt-4">
          <div className="border border-border rounded-lg p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              <div className="space-y-4">
                <FieldRow label="Date of Birth" value={getVal('dateOfBirth')} editMode={editMode} field="dateOfBirth" onChange={handleChange} type="date" />
                <FieldRow label="Residing Address" value={getVal('residingAddress')} editMode={editMode} field="residingAddress" onChange={handleChange} />
                <FieldRow label="Nationality" value={getVal('nationality')} editMode={editMode} field="nationality" onChange={handleChange} />
                <FieldRow label="Personal Email" value={getVal('personalEmail')} editMode={editMode} field="personalEmail" onChange={handleChange} type="email" />
                <FieldRow label="Gender" value={getVal('gender')} editMode={editMode} field="gender" onChange={handleChange} />
                <FieldRow label="Marital Status" value={getVal('maritalStatus')} editMode={editMode} field="maritalStatus" onChange={handleChange} />
                <FieldRow label="Date of Joining" value={getVal('dateOfJoining')} editMode={editMode && isAdmin} field="dateOfJoining" onChange={handleChange} type="date" />
                <FieldRow label="Emp Code" value={getVal('empCode')} editMode={editMode && isAdmin} field="empCode" onChange={handleChange} />
              </div>
              <div className="space-y-4">
                <p className="font-semibold text-sm">Bank Details</p>
                <FieldRow label="Account Number" value={getVal('accountNumber')} editMode={editMode} field="accountNumber" onChange={handleChange} />
                <FieldRow label="Bank Name" value={getVal('bankName')} editMode={editMode} field="bankName" onChange={handleChange} />
                <FieldRow label="IFSC Code" value={getVal('ifscCode')} editMode={editMode} field="ifscCode" onChange={handleChange} />
                <FieldRow label="PAN No" value={getVal('panNo')} editMode={editMode} field="panNo" onChange={handleChange} />
                <FieldRow label="UAN No" value={getVal('uanNo')} editMode={editMode} field="uanNo" onChange={handleChange} />
              </div>
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="salary" className="mt-4">
            <div className="border border-border rounded-lg p-5">
              <SalaryInfoTab emp={emp} isAdmin={isAdmin} />
            </div>
          </TabsContent>
        )}

        {isSelf && (
          <TabsContent value="security" className="mt-4">
            <div className="border border-border rounded-lg p-5">
              <SecurityTab />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Profile;

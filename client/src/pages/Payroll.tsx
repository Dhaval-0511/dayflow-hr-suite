import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, computeSalaryComponents } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Pencil, Save, X } from 'lucide-react';

type PayrollRecord = {
  employeeId: string;
  employeeName: string;
  firstName: string;
  lastName: string;
  jobPosition: string;
  department: string;
  monthlyWage: number;
  workingDaysPerWeek: number;
  breakTimeHrs: number;
  components: ReturnType<typeof computeSalaryComponents>;
};

const fmt = (n: number) => `₹${n.toFixed(2)}`;

const PayrollRow: React.FC<{ record: PayrollRecord; isAdmin: boolean; onUpdate: () => void }> = ({
  record, isAdmin, onUpdate
}) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wage, setWage] = useState(String(record.monthlyWage));
  const [saving, setSaving] = useState(false);

  const c = computeSalaryComponents(parseFloat(wage) || 0);

  const save = async () => {
    setSaving(true);
    try {
      await api.updatePayroll(record.employeeId, { monthlyWage: parseFloat(wage) });
      setEditing(false);
      onUpdate();
    } catch {}
    setSaving(false);
  };

  return (
    <>
      <tr className="hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            <div>
              <p className="font-medium text-sm">{record.employeeName}</p>
              <p className="text-xs text-muted-foreground">{record.jobPosition}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">{record.department}</td>
        <td className="px-4 py-3" onClick={e => isAdmin && e.stopPropagation()}>
          {editing ? (
            <div className="flex items-center gap-2">
              <Input value={wage} onChange={e => setWage(e.target.value)} type="number"
                className="h-7 w-28 text-sm" />
              <Button size="sm" onClick={save} disabled={saving} className="h-6 bg-purple-600 hover:bg-purple-700 px-2 text-xs">
                <Save className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="h-6 px-2">
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium">₹{Number(record.monthlyWage).toLocaleString('en-IN')}</span>
              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); setEditing(true); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-purple-400">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-green-400">
          {fmt(computeSalaryComponents(record.monthlyWage).netPay)}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={4} className="px-6 pb-4 bg-muted/20">
            <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Salary Components</h4>
                {[
                  { name: 'Basic Salary', amount: c.basic, pct: c.basicPct },
                  { name: 'House Rent Allowance', amount: c.hra, pct: c.hraPct },
                  { name: 'Standard Allowance', amount: c.standardAllowance, pct: c.standardAllowancePct },
                  { name: 'Performance Bonus', amount: c.perf, pct: c.perfPct },
                  { name: 'Leave Travel Allowance', amount: c.lta, pct: c.ltaPct },
                  { name: 'Fixed Allowance', amount: c.fixed, pct: c.fixedPct },
                ].map(item => (
                  <div key={item.name} className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-xs">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-purple-400">{fmt(item.amount)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{item.pct.toFixed(2)}%</Badge>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1 border-t border-border font-medium">
                  <span className="text-xs">Gross Pay</span>
                  <span className="text-xs text-blue-400">{fmt(c.gross)}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">PF Contributions</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-border/40">
                    <span>Employee PF (12%)</span>
                    <span className="text-red-400">-{fmt(c.employeePf)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-border/40">
                    <span>Employer PF (12%)</span>
                    <span className="text-muted-foreground">{fmt(c.employerPf)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Tax Deductions</h4>
                  <div className="flex justify-between text-xs py-1 border-b border-border/40">
                    <span>Professional Tax</span>
                    <span className="text-red-400">-{fmt(c.profTax)}</span>
                  </div>
                </div>
                <div className="border border-green-500/30 rounded-lg p-3 bg-green-500/5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Net Pay</span>
                    <span className="text-lg font-bold text-green-400">{fmt(c.netPay)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{fmt(c.netPay * 12)} / year</p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const Payroll: React.FC = () => {
  const { role } = useAuth();
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const isAdmin = role === 'admin' || role === 'hr';

  const load = async () => {
    try {
      const data = await api.getPayroll();
      setRecords(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const totalPayroll = records.reduce((s, r) => s + r.monthlyWage, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Salary structure and breakdown</p>
        </div>
        {isAdmin && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Monthly Payroll</p>
            <p className="text-xl font-bold text-purple-400">₹{totalPayroll.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Employee', 'Department', 'Monthly Wage', 'Net Pay'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border group">
            {records.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No payroll records</td></tr>
            ) : records.map(r => (
              <PayrollRow key={r.employeeId} record={r} isAdmin={isAdmin} onUpdate={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payroll;

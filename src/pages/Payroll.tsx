import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Loader2,
  Edit,
  Save
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const Payroll: React.FC = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdminOrHR = role === 'admin' || role === 'hr';
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  
  const targetUserId = selectedEmployee || user?.id;

  // Fetch employees for admin
  const { data: employees } = useQuery({
    queryKey: ['employees-payroll'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id, department, designation')
        .eq('is_active', true)
        .order('first_name');
      return data || [];
    },
    enabled: isAdminOrHR,
  });

  // Fetch salary structure
  const { data: salaryStructure, isLoading } = useQuery({
    queryKey: ['salary-structure', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('salary_structure')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch employee profile for name
  const { data: employeeProfile } = useQuery({
    queryKey: ['profile-payroll', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  // Fetch this month's attendance for payroll calculation
  const { data: monthlyAttendance } = useQuery({
    queryKey: ['monthly-attendance', targetUserId],
    queryFn: async () => {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('date', start)
        .lte('date', end);
      
      return data || [];
    },
    enabled: !!targetUserId,
  });

  // Update salary mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('salary_structure')
        .update({
          basic_salary: parseFloat(data.basic_salary) || 0,
          hra: parseFloat(data.hra) || 0,
          transport_allowance: parseFloat(data.transport_allowance) || 0,
          medical_allowance: parseFloat(data.medical_allowance) || 0,
          other_allowances: parseFloat(data.other_allowances) || 0,
          pf_deduction: parseFloat(data.pf_deduction) || 0,
          tax_deduction: parseFloat(data.tax_deduction) || 0,
          other_deductions: parseFloat(data.other_deductions) || 0,
          effective_from: data.effective_from || new Date().toISOString().split('T')[0],
        })
        .eq('user_id', targetUserId);
      
      if (error) throw error;

      // Create notification for salary update
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: 'Salary Structure Updated',
        message: `Your salary structure has been updated effective from ${format(new Date(data.effective_from || new Date()), 'MMMM d, yyyy')}.`,
        type: 'info',
      });
    },
    onSuccess: () => {
      toast({ title: 'Salary Updated', description: 'Salary structure has been updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['salary-structure'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const calculateGrossSalary = () => {
    if (!salaryStructure) return 0;
    return (salaryStructure.basic_salary || 0) +
      (salaryStructure.hra || 0) +
      (salaryStructure.transport_allowance || 0) +
      (salaryStructure.medical_allowance || 0) +
      (salaryStructure.other_allowances || 0);
  };

  const calculateTotalDeductions = () => {
    if (!salaryStructure) return 0;
    return (salaryStructure.pf_deduction || 0) +
      (salaryStructure.tax_deduction || 0) +
      (salaryStructure.other_deductions || 0);
  };

  // Calculate attendance-based salary
  const calculateAttendanceBasedSalary = () => {
    const grossSalary = calculateGrossSalary();
    const totalDeductions = calculateTotalDeductions();
    const baseSalary = grossSalary - totalDeductions;
    
    // Get working days in month (excluding weekends)
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    let workingDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workingDays++;
    }

    const presentDays = monthlyAttendance?.filter(a => a.status === 'present').length || 0;
    const halfDays = monthlyAttendance?.filter(a => a.status === 'half_day').length || 0;
    const leaveDays = monthlyAttendance?.filter(a => a.status === 'leave').length || 0;
    const absentDays = monthlyAttendance?.filter(a => a.status === 'absent').length || 0;
    
    const effectiveDays = presentDays + (halfDays * 0.5) + leaveDays;
    const perDaySalary = baseSalary / workingDays;
    const lossOfPay = absentDays * perDaySalary;

    return {
      workingDays,
      presentDays,
      halfDays,
      leaveDays,
      absentDays,
      perDaySalary,
      lossOfPay,
      netPayable: baseSalary - lossOfPay,
    };
  };

  const attendanceCalc = calculateAttendanceBasedSalary();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditSalary = () => {
    setEditData({
      basic_salary: salaryStructure?.basic_salary || 0,
      hra: salaryStructure?.hra || 0,
      transport_allowance: salaryStructure?.transport_allowance || 0,
      medical_allowance: salaryStructure?.medical_allowance || 0,
      other_allowances: salaryStructure?.other_allowances || 0,
      pf_deduction: salaryStructure?.pf_deduction || 0,
      tax_deduction: salaryStructure?.tax_deduction || 0,
      other_deductions: salaryStructure?.other_deductions || 0,
      effective_from: salaryStructure?.effective_from || new Date().toISOString().split('T')[0],
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">
            {isAdminOrHR ? 'View and manage employee salaries' : 'View your salary details'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isAdminOrHR && (
            <>
              <Select value={selectedEmployee || ''} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedEmployee && (
                <Button onClick={handleEditSalary} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Salary
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Employee Info */}
      {employeeProfile && (
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                  {employeeProfile.first_name?.[0]}{employeeProfile.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{employeeProfile.first_name} {employeeProfile.last_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {employeeProfile.designation} • {employeeProfile.department}
                  </p>
                  <Badge variant="secondary" className="mt-1">{employeeProfile.employee_id}</Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Pay Period</p>
                <p className="font-medium">{format(new Date(), 'MMMM yyyy')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Salary
            </CardTitle>
            <div className="p-2 rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(calculateGrossSalary())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total earnings</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deductions
            </CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10">
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(calculateTotalDeductions())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">PF, Tax & others</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loss of Pay
            </CardTitle>
            <div className="p-2 rounded-lg bg-warning/10">
              <Calendar className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatCurrency(attendanceCalc.lossOfPay)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{attendanceCalc.absentDays} absent days</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Payable
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(attendanceCalc.netPayable)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Take-home pay</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary for this month */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Attendance Summary - {format(new Date(), 'MMMM yyyy')}</CardTitle>
          <CardDescription>Attendance breakdown affecting payroll</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{attendanceCalc.workingDays}</p>
              <p className="text-sm text-muted-foreground">Working Days</p>
            </div>
            <div className="text-center p-4 bg-success/10 rounded-lg">
              <p className="text-2xl font-bold text-success">{attendanceCalc.presentDays}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center p-4 bg-warning/10 rounded-lg">
              <p className="text-2xl font-bold text-warning">{attendanceCalc.halfDays}</p>
              <p className="text-sm text-muted-foreground">Half Days</p>
            </div>
            <div className="text-center p-4 bg-info/10 rounded-lg">
              <p className="text-2xl font-bold text-info">{attendanceCalc.leaveDays}</p>
              <p className="text-sm text-muted-foreground">Leaves</p>
            </div>
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{attendanceCalc.absentDays}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Earnings</CardTitle>
                <CardDescription>Monthly salary components</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Basic Salary</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.basic_salary || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">House Rent Allowance (HRA)</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.hra || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Transport Allowance</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.transport_allowance || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Medical Allowance</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.medical_allowance || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Other Allowances</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.other_allowances || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-success">Total Earnings</span>
              <span className="font-bold text-lg text-success">{formatCurrency(calculateGrossSalary())}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Deductions</CardTitle>
                <CardDescription>Monthly salary deductions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Provident Fund (PF)</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.pf_deduction || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Income Tax (TDS)</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.tax_deduction || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Other Deductions</span>
              <span className="font-semibold">{formatCurrency(salaryStructure?.other_deductions || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Loss of Pay ({attendanceCalc.absentDays} days)</span>
              <span className="font-semibold text-warning">{formatCurrency(attendanceCalc.lossOfPay)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-destructive">Total Deductions</span>
              <span className="font-bold text-lg text-destructive">{formatCurrency(calculateTotalDeductions() + attendanceCalc.lossOfPay)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Salary Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Salary Structure</DialogTitle>
            <DialogDescription>
              Update earnings and deductions for {employeeProfile?.first_name} {employeeProfile?.last_name}
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-6 py-4">
              <div>
                <h4 className="font-semibold text-success mb-3">Earnings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={editData.basic_salary}
                      onChange={(e) => setEditData({ ...editData, basic_salary: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HRA</Label>
                    <Input
                      type="number"
                      value={editData.hra}
                      onChange={(e) => setEditData({ ...editData, hra: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transport Allowance</Label>
                    <Input
                      type="number"
                      value={editData.transport_allowance}
                      onChange={(e) => setEditData({ ...editData, transport_allowance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medical Allowance</Label>
                    <Input
                      type="number"
                      value={editData.medical_allowance}
                      onChange={(e) => setEditData({ ...editData, medical_allowance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Allowances</Label>
                    <Input
                      type="number"
                      value={editData.other_allowances}
                      onChange={(e) => setEditData({ ...editData, other_allowances: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-destructive mb-3">Deductions</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PF Deduction</Label>
                    <Input
                      type="number"
                      value={editData.pf_deduction}
                      onChange={(e) => setEditData({ ...editData, pf_deduction: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Deduction</Label>
                    <Input
                      type="number"
                      value={editData.tax_deduction}
                      onChange={(e) => setEditData({ ...editData, tax_deduction: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Deductions</Label>
                    <Input
                      type="number"
                      value={editData.other_deductions}
                      onChange={(e) => setEditData({ ...editData, other_deductions: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={editData.effective_from}
                  onChange={(e) => setEditData({ ...editData, effective_from: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateSalaryMutation.mutate(editData)}
              disabled={updateSalaryMutation.isPending}
              className="gap-2"
            >
              {updateSalaryMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;

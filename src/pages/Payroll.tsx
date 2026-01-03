import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react';
import { useState } from 'react';

const Payroll: React.FC = () => {
  const { user, role } = useAuth();
  const isAdminOrHR = role === 'admin' || role === 'hr';
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  
  const targetUserId = selectedEmployee || user?.id;

  // Fetch employees for admin
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id')
        .eq('is_active', true);
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
    queryKey: ['profile', targetUserId],
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

  const calculateNetSalary = () => {
    return calculateGrossSalary() - calculateTotalDeductions();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
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
        {isAdminOrHR && (
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
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <div className="text-3xl font-bold text-success">
              {formatCurrency(calculateGrossSalary())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total earnings before deductions</p>
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
            <div className="text-3xl font-bold text-destructive">
              {formatCurrency(calculateTotalDeductions())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">PF, Tax, and other deductions</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Salary
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(calculateNetSalary())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Take-home pay per month</p>
          </CardContent>
        </Card>
      </div>

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
            <Separator />
            <div className="flex justify-between items-center py-2">
              <span className="font-semibold text-destructive">Total Deductions</span>
              <span className="font-bold text-lg text-destructive">{formatCurrency(calculateTotalDeductions())}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Salary Effective From</p>
                <p className="text-sm text-muted-foreground">
                  {salaryStructure?.effective_from 
                    ? new Date(salaryStructure.effective_from).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not specified'
                  }
                </p>
              </div>
            </div>
            {isAdminOrHR && employeeProfile && (
              <div className="text-right">
                <p className="font-medium">{employeeProfile.first_name} {employeeProfile.last_name}</p>
                <p className="text-sm text-muted-foreground">
                  {employeeProfile.designation} • {employeeProfile.department}
                </p>
                <Badge variant="secondary" className="mt-1">{employeeProfile.employee_id}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;

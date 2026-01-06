import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Filter, 
  Eye,
  Edit,
  UserX,
  UserCheck,
  Loader2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Clock,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const Employees: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const today = new Date().toISOString().split('T')[0];

  // Fetch all employees with roles
  const { data: employees, isLoading } = useQuery({
    queryKey: ['all-employees-with-roles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (role)
        `)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('user_id, status, check_in, check_out')
        .eq('date', today);
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Create a map of user_id to attendance status
  const attendanceMap = new Map(
    todayAttendance?.map(a => [a.user_id, a]) || []
  );

  // Get unique departments
  const departments = [...new Set(employees?.map(e => e.department).filter(Boolean))] as string[];

  // Filter employees
  const filteredEmployees = employees?.filter(emp => {
    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active);
    
    const attendance = attendanceMap.get(emp.id);
    const matchesAttendance = attendanceFilter === 'all' ||
      (attendanceFilter === 'present' && (attendance?.status === 'present' || attendance?.status === 'half_day')) ||
      (attendanceFilter === 'absent' && !attendance);
    
    return matchesSearch && matchesDepartment && matchesStatus && matchesAttendance;
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status Updated', description: 'Employee status has been updated.' });
      queryClient.invalidateQueries({ queryKey: ['all-employees-with-roles'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          department: data.department,
          designation: data.designation,
          date_of_joining: data.date_of_joining,
          phone: data.phone,
          address: data.address,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Employee Updated', description: 'Employee details have been updated.' });
      queryClient.invalidateQueries({ queryKey: ['all-employees-with-roles'] });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleViewEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleEditEmployee = (employee: any) => {
    setEditData({
      id: employee.id,
      department: employee.department || '',
      designation: employee.designation || '',
      date_of_joining: employee.date_of_joining || '',
      phone: employee.phone || '',
      address: employee.address || '',
    });
    setIsEditDialogOpen(true);
  };

  const getAttendanceStatus = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) {
      return <Badge variant="destructive" className="text-xs">Absent</Badge>;
    }
    if (attendance.status === 'half_day') {
      return <Badge className="bg-warning/10 text-warning text-xs">Half Day</Badge>;
    }
    return <Badge className="bg-success/10 text-success text-xs">Present</Badge>;
  };

  const presentCount = employees?.filter(emp => attendanceMap.has(emp.id)).length || 0;
  const absentCount = (employees?.length || 0) - presentCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your workforce</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1.5">
            <Users className="h-4 w-4 mr-2" />
            {employees?.length || 0} Total
          </Badge>
          <Badge className="bg-success/10 text-success px-3 py-1.5">
            <UserCheck className="h-4 w-4 mr-2" />
            {presentCount} Present
          </Badge>
          <Badge className="bg-destructive/10 text-destructive px-3 py-1.5">
            <UserX className="h-4 w-4 mr-2" />
            {absentCount} Absent
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
              <SelectTrigger className="w-40">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Attendance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Attendance</SelectItem>
                <SelectItem value="present">Present Today</SelectItem>
                <SelectItem value="absent">Absent Today</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card className="shadow-soft">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Today's Attendance</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const attendance = attendanceMap.get(employee.id);
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {employee.first_name?.[0]}{employee.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.employee_id}</Badge>
                        </TableCell>
                        <TableCell>{employee.department || '-'}</TableCell>
                        <TableCell>{employee.designation || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {(employee.user_roles as any)?.[0]?.role || 'employee'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={employee.is_active ? 'bg-success' : 'bg-destructive'}>
                            {employee.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getAttendanceStatus(employee.id)}
                            {attendance?.check_in && (
                              <span className="text-xs text-muted-foreground">
                                In: {format(new Date(attendance.check_in), 'h:mm a')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.date_of_joining 
                            ? format(new Date(employee.date_of_joining), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleViewEmployee(employee)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditEmployee(employee)}
                              title="Edit Employee"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => toggleStatusMutation.mutate({ 
                                id: employee.id, 
                                isActive: employee.is_active 
                              })}
                              title={employee.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {employee.is_active ? (
                                <UserX className="h-4 w-4 text-destructive" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-success" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No employees found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Complete information about the employee
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {selectedEmployee.first_name?.[0]}{selectedEmployee.last_name?.[0]}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="text-muted-foreground">{selectedEmployee.employee_id}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className={selectedEmployee.is_active ? 'bg-success' : 'bg-destructive'}>
                      {selectedEmployee.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {getAttendanceStatus(selectedEmployee.id)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedEmployee.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <p className="font-medium">{selectedEmployee.department || 'Not assigned'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">Designation</Label>
                      <p className="font-medium">{selectedEmployee.designation || 'Not assigned'}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Joining</Label>
                    <p className="font-medium">
                      {selectedEmployee.date_of_joining 
                        ? format(new Date(selectedEmployee.date_of_joining), 'MMMM d, yyyy')
                        : 'Not specified'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    <p className="font-medium">{selectedEmployee.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              setIsViewDialogOpen(false);
              handleEditEmployee(selectedEmployee);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update job details and other information
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={editData.designation}
                    onChange={(e) => setEditData({ ...editData, designation: e.target.value })}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date of Joining</Label>
                <Input
                  type="date"
                  value={editData.date_of_joining}
                  onChange={(e) => setEditData({ ...editData, date_of_joining: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateEmployeeMutation.mutate(editData)}
              disabled={updateEmployeeMutation.isPending}
            >
              {updateEmployeeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;

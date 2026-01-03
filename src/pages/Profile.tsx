import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Building2,
  Shield,
  Edit,
  Save,
  X,
  Loader2
} from 'lucide-react';

const Profile: React.FC = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    phone: profile?.phone || '',
    address: profile?.address || '',
    emergency_contact: profile?.emergency_contact || '',
  });

  // Fetch salary structure
  const { data: salaryStructure } = useQuery({
    queryKey: ['salary-structure', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('salary_structure')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: data.phone,
          address: data.address,
          emergency_contact: data.emergency_contact,
        })
        .eq('id', user?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      refreshProfile();
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditData({
      phone: profile?.phone || '',
      address: profile?.address || '',
      emergency_contact: profile?.emergency_contact || '',
    });
    setIsEditing(false);
  };

  const calculateNetSalary = () => {
    if (!salaryStructure) return 0;
    const gross = (salaryStructure.basic_salary || 0) +
      (salaryStructure.hra || 0) +
      (salaryStructure.transport_allowance || 0) +
      (salaryStructure.medical_allowance || 0) +
      (salaryStructure.other_allowances || 0);
    const deductions = (salaryStructure.pf_deduction || 0) +
      (salaryStructure.tax_deduction || 0) +
      (salaryStructure.other_deductions || 0);
    return gross - deductions;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="gap-2"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="job">Job Details</TabsTrigger>
          <TabsTrigger value="salary">Salary Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {profile?.first_name} {profile?.last_name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="capitalize">{role}</Badge>
                    <span>•</span>
                    <span>{profile?.employee_id}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    {isEditing ? (
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        placeholder="Enter phone number"
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{profile?.phone || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                    <p className="font-medium">
                      {profile?.date_of_birth 
                        ? new Date(profile.date_of_birth).toLocaleDateString()
                        : 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    {isEditing ? (
                      <Input
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        placeholder="Enter address"
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{profile?.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Emergency Contact</Label>
                    {isEditing ? (
                      <Input
                        value={editData.emergency_contact}
                        onChange={(e) => setEditData({ ...editData, emergency_contact: e.target.value })}
                        placeholder="Enter emergency contact"
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{profile?.emergency_contact || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="job" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Job Information</CardTitle>
              <CardDescription>Your employment details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Designation</Label>
                    <p className="font-medium">{profile?.designation || 'Not assigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Department</Label>
                    <p className="font-medium">{profile?.department || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Date of Joining</Label>
                    <p className="font-medium">
                      {profile?.date_of_joining 
                        ? new Date(profile.date_of_joining).toLocaleDateString()
                        : 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge className={profile?.is_active ? 'bg-success' : 'bg-destructive'}>
                      {profile?.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Salary Structure</CardTitle>
              <CardDescription>Your compensation breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold text-success flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    Earnings
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-medium">₹{salaryStructure?.basic_salary?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">HRA</span>
                      <span className="font-medium">₹{salaryStructure?.hra?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transport Allowance</span>
                      <span className="font-medium">₹{salaryStructure?.transport_allowance?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Medical Allowance</span>
                      <span className="font-medium">₹{salaryStructure?.medical_allowance?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other Allowances</span>
                      <span className="font-medium">₹{salaryStructure?.other_allowances?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-destructive flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Deductions
                  </h4>
                  <div className="space-y-3 pl-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PF Deduction</span>
                      <span className="font-medium">₹{salaryStructure?.pf_deduction?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax Deduction</span>
                      <span className="font-medium">₹{salaryStructure?.tax_deduction?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Other Deductions</span>
                      <span className="font-medium">₹{salaryStructure?.other_deductions?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Net Salary (Monthly)</p>
                  <p className="text-3xl font-bold text-primary">
                    ₹{calculateNetSalary().toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Effective From</p>
                  <p className="font-medium">
                    {salaryStructure?.effective_from 
                      ? new Date(salaryStructure.effective_from).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;

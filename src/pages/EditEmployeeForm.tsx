import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const EditEmployeeForm = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase.from("employees").select("*").eq("id", id).single();
      if (error) {
        toast({ title: "Error", description: "Employee not found", variant: "destructive" });
        navigate("/employee-management");
      } else {
        setEmployee(data);
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmployee((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.from("employees").update(employee).eq("id", id);
    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Employee Updated", description: "Changes saved successfully." });
      navigate("/employee-management");
    }
    setIsLoading(false);
  };

  if (!employee) return <p className="text-center p-6">Loading...</p>;

  return (
    <Card className="max-w-3xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Edit Employee</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel name="first_name" label="First Name" value={employee.first_name} onChange={handleChange} />
            <InputWithLabel name="last_name" label="Last Name" value={employee.last_name} onChange={handleChange} />
            <InputWithLabel name="email" label="Email" value={employee.email} onChange={handleChange} />
            <InputWithLabel name="phone" label="Phone" value={employee.phone} onChange={handleChange} />
            <InputWithLabel name="position" label="Position" value={employee.position} onChange={handleChange} />
            <InputWithLabel name="department" label="Department" value={employee.department} onChange={handleChange} />
          </div>
          <TextareaWithLabel name="address" label="Address" value={employee.address} onChange={handleChange} />
          <InputWithLabel name="salary" label="Salary" type="number" value={employee.salary} onChange={handleChange} />
          <InputWithLabel name="emergency_contact" label="Emergency Contact" value={employee.emergency_contact} onChange={handleChange} />
          <InputWithLabel name="emergency_phone" label="Emergency Phone" value={employee.emergency_phone} onChange={handleChange} />

          <Button type="submit" className="w-full bg-blue-600 text-white" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const InputWithLabel = ({ name, label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} name={name} value={value} onChange={onChange} type={type} required />
  </div>
);

const TextareaWithLabel = ({ name, label, value, onChange }: any) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Textarea id={name} name={name} value={value} onChange={onChange} />
  </div>
);

export default EditEmployeeForm;

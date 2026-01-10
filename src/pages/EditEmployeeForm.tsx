import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EditEmployeeForm = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        toast({
          title: "Error",
          description: "Employee not found",
          variant: "destructive",
        });
        navigate("/employee-management");
      } else {
        setEmployee({
          ...data,
          salary_type: data.salary_type || "monthly",
          currency: data.currency || "USD",
          salary: data.salary ?? "",
        });
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEmployee((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      address: employee.address || null,

      salary: employee.salary === "" ? null : Number(employee.salary),
      salary_type: employee.salary_type || "monthly",
      currency: employee.currency || "USD",

      emergency_contact: employee.emergency_contact || null,
      emergency_phone: employee.emergency_phone || null,
    };

    const { error } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", id);
    if (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "✅ Employee Updated",
        description: "Changes saved successfully.",
      });
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
            <InputWithLabel
              name="first_name"
              label="First Name"
              value={employee.first_name}
              onChange={handleChange}
            />
            <InputWithLabel
              name="last_name"
              label="Last Name"
              value={employee.last_name}
              onChange={handleChange}
            />
            <InputWithLabel
              name="email"
              label="Email"
              value={employee.email}
              onChange={handleChange}
            />
            <InputWithLabel
              name="phone"
              label="Phone"
              value={employee.phone}
              onChange={handleChange}
            />
            <InputWithLabel
              name="position"
              label="Position"
              value={employee.position}
              onChange={handleChange}
            />
            <InputWithLabel
              name="department"
              label="Department"
              value={employee.department}
              onChange={handleChange}
            />
          </div>
          <TextareaWithLabel
            name="address"
            label="Address"
            value={employee.address}
            onChange={handleChange}
          />
          {/* Salary Setup */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-base font-semibold">Salary Setup</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Update type, currency and amount
                </p>
              </div>

              <div className="text-xs font-semibold px-3 py-1 rounded-full border bg-slate-50">
                {employee.currency} •{" "}
                {String(employee.salary_type || "monthly").toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Salary Type */}
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={employee.salary_type}
                  onValueChange={(val) =>
                    setEmployee((prev: any) => ({ ...prev, salary_type: val }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={employee.currency}
                  onValueChange={(val) =>
                    setEmployee((prev: any) => ({ ...prev, currency: val }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="CFA">CFA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Salary Amount */}
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    {employee.currency === "USD" ? "$" : "CFA"}
                  </span>
                  <Input
                    type="number"
                    name="salary"
                    value={employee.salary}
                    onChange={handleChange}
                    min={0}
                    step="0.01"
                    className="h-11 rounded-lg pl-12"
                    placeholder={
                      employee.salary_type === "hourly" ? "e.g. 8" : "e.g. 1200"
                    }
                    required
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {employee.salary_type === "hourly" ? "Per hour" : "Per month"}
                </p>
              </div>
            </div>
          </div>

          <InputWithLabel
            name="emergency_contact"
            label="Emergency Contact"
            value={employee.emergency_contact}
            onChange={handleChange}
          />
          <InputWithLabel
            name="emergency_phone"
            label="Emergency Phone"
            value={employee.emergency_phone}
            onChange={handleChange}
          />

          <Button
            type="submit"
            className="w-full bg-blue-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const InputWithLabel = ({
  name,
  label,
  value,
  onChange,
  type = "text",
}: any) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Input
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      required
    />
  </div>
);

const TextareaWithLabel = ({ name, label, value, onChange }: any) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Textarea id={name} name={name} value={value} onChange={onChange} />
  </div>
);

export default EditEmployeeForm;

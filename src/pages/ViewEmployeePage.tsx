import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User } from "lucide-react";

const ViewEmployeePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();
      if (!error) setEmployee(data);
      else navigate("/employee-management");
    };
    if (id) fetchEmployee();
  }, [id]);

  if (!employee) return <p className="text-center p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto py-10">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-6 w-6" />
              <span>
                {employee.first_name} {employee.last_name}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email" value={employee.email} />
              <Field label="Phone" value={employee.phone} />
              <Field label="Position" value={employee.position} />
              <Field label="Department" value={employee.department} />
              <Field
                label="Salary"
                value={
                  employee.salary ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold">
                        {employee.currency === "USD"
                          ? "$"
                          : employee.currency || ""}
                        {employee.salary}
                      </span>
                      <span className="text-xs text-gray-600 bg-white/70 border rounded-full px-2 py-0.5">
                        / {employee.salary_type || "monthly"}
                      </span>
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <Field label="Joining Date" value={employee.joining_date} />
              <Field label="Employment Type" value={employee.employment_type} />
              <Field
                label="Status"
                value={
                  <Badge
                    variant={
                      employee.status === "active" ? "default" : "secondary"
                    }
                  >
                    {employee.status}
                  </Badge>
                }
              />
            </div>

            <Field label="Address" value={employee.address} full />
            <Field
              label="Emergency Contact"
              value={employee.emergency_contact}
            />
            <Field label="Emergency Phone" value={employee.emergency_phone} />
            {employee.fingerprint_id && (
              <Field
                label="Fingerprint ID"
                value={employee.fingerprint_id}
                full
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  full = false,
}: {
  label: string;
  value: any;
  full?: boolean;
}) => (
  <div className={full ? "col-span-full" : ""}>
    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
    <p className="text-sm text-gray-800 bg-gray-100 rounded p-2">
      {value || "-"}
    </p>
  </div>
);

export default ViewEmployeePage;

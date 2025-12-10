import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";

const AttendanceWidget = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const today = dayjs().format("YYYY-MM-DD");
  const startOfDay = dayjs().startOf("day").toISOString();
  const endOfDay = dayjs().endOf("day").toISOString();

  // ✅ Fetch all employees
  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("employees").select("*");
    if (!error && data) setEmployees(data);
  };

  // ✅ Fetch today's attendance using check_in timestamp
  const fetchAttendance = async () => {
    const { data, error } = await supabase
      .from("attendances")
      .select("*")
      .gte("check_in", startOfDay)
      .lt("check_in", endOfDay);

    if (!error && data) setAttendanceRecords(data);
  };

  const getEmployeeStatus = (employeeId: string) => {
    const record = attendanceRecords.find((r) => r.employee_id === employeeId);
    if (!record) return "absent";
    if (record.check_out) return "completed";
    if (record.check_in) return "present";
    return "absent";
  };

  const markAttendance = async (employeeId: string, action: "check-in" | "check-out") => {
    if (action === "check-in") {
      await supabase.from("attendances").insert([
        { employee_id: employeeId, check_in: new Date().toISOString(), status: "checked_in" },
      ]);
    } else {
      const { data: latest } = await supabase
        .from("attendances")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("check_in", startOfDay)
        .lt("check_in", endOfDay)
        .order("check_in", { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        const totalMs = new Date().getTime() - new Date(latest.check_in).getTime();
        const totalHours = +(totalMs / (1000 * 60 * 60)).toFixed(2);

        await supabase
          .from("attendances")
          .update({
            check_out: new Date().toISOString(),
            status: "checked_out",
            total_hours: totalHours,
          })
          .eq("id", latest.id);
      }
    }
    fetchAttendance();
  };

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Quick Attendance</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {employees.slice(0, 5).map((employee) => {
            const status = getEmployeeStatus(employee.id);
            return (
              <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-100 p-2 rounded-full">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{employee.name}</p>
                    <p className="text-xs text-gray-600">{employee.department}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {status === "absent" && (
                    <>
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Absent
                      </Badge>
                      <Button size="sm" onClick={() => markAttendance(employee.id, "check-in")} className="h-8 text-xs">
                        Check In
                      </Button>
                    </>
                  )}
                  {status === "present" && (
                    <>
                      <Badge className="bg-yellow-500 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Present
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAttendance(employee.id, "check-out")}
                        className="h-8 text-xs"
                      >
                        Check Out
                      </Button>
                    </>
                  )}
                  {status === "completed" && (
                    <Badge className="bg-green-500 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceWidget;

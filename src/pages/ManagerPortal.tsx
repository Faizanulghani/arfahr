// src/pages/ManagerPortal.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  CheckCircle,
  Calendar,
  LogOut,
  UserCheck,
  TrendingUp,
  Activity,
  Eye,
  PlusCircle,
  Bell,
  Pencil,
  Trash2,
  DollarSign,
  SendHorizonal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ===== Types =====
type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position?: string | null;
  role?: string | null;
  joining_date?: string | null;
};

type Attendance = {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  status: "present" | "late" | "absent";
  check_in?: string | null;
  check_out?: string | null;
};

type NotificationRow = {
  id: string;
  employee_id: string | null;
  message: string;
  read: boolean | null;
  created_at: string | null;
};

type SalaryStructure = {
  id: string;
  employee_id: string | null;
  employee_name: string;
  basic_salary: number;
  hours_worked: number | null;
  hourly_rate: number | null;
  overtime_hours: number | null;
  overtime_rate: number | null;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  gross_salary: number;
  net_salary: number;
  currency: string;
  country: string | null;
  effective_date: string; // date string
  is_active: boolean | null;
  created_at: string | null;
  approval_status: "pending" | "approved" | "rejected";
  payment_status: "pending" | "processing" | "paid" | "failed";
};

// ===== Helpers =====
const toCurrency = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n || 0);

const sum = (obj?: Record<string, number> | null) =>
  Object.values(obj || {}).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

const computeGrossNet = (s: {
  basic_salary: number;
  hours_worked?: number | null;
  hourly_rate?: number | null;
  overtime_hours?: number | null;
  overtime_rate?: number | null;
  allowances?: Record<string, number> | null;
  deductions?: Record<string, number> | null;
}) => {
  const base = Number(s.basic_salary) || 0;
  const hw = Number(s.hours_worked || 0);
  const hr = Number(s.hourly_rate || 0);
  const oh = Number(s.overtime_hours || 0);
  const orate = Number(s.overtime_rate || 0);
  // overtime: normal hourly pay + overtime component
  const regularPay = hw * hr;
  const overtimePay = oh * orate;
  const alw = sum(s.allowances || {});
  const ded = sum(s.deductions || {});
  const gross = base + regularPay + overtimePay + alw;
  const net = gross - ded;
  return { gross, net, overtimePay: regularPay + overtimePay };
};

const todayStr = () => new Date().toISOString().split("T")[0];

// ============================================================
//                          Component
// ============================================================
const ManagerPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [manager, setManager] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);

  // ---- NEW: Notifications state ----
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- NEW: Salary structures state ----
  const [salaries, setSalaries] = useState<SalaryStructure[]>([]);

  // ---- NEW: Modals state ----
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifEmployeeId, setNotifEmployeeId] = useState<string | null>(null);
  const [notifMessage, setNotifMessage] = useState("");

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryForm, setSalaryForm] = useState<Partial<SalaryStructure>>({
    employee_id: null,
    employee_name: "",
    basic_salary: 0,
    hours_worked: 0,
    hourly_rate: 0,
    overtime_hours: 0,
    overtime_rate: 0,
    allowances: { housing: 0, transport: 0 },
    deductions: { tax: 0, pension: 0 },
    currency: "USD",
    country: "USA",
    effective_date: todayStr(),
    approval_status: "pending",
    payment_status: "pending",
    is_active: true,
  });

  // Live computations
  const { gross, net, overtimePay } = computeGrossNet({
    basic_salary: Number(salaryForm.basic_salary || 0),
    hours_worked: Number(salaryForm.hours_worked || 0),
    hourly_rate: Number(salaryForm.hourly_rate || 0),
    overtime_hours: Number(salaryForm.overtime_hours || 0),
    overtime_rate: Number(salaryForm.overtime_rate || 0),
    allowances: salaryForm.allowances || {},
    deductions: salaryForm.deductions || {},
  });

  // ---- Live clock ----
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- Auth guard + role check ----
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        if (!cancelled) navigate("/login");
        return;
      }

      const email = sessionData.session.user.email ?? null;
      if (!email) {
        if (!cancelled) navigate("/login");
        return;
      }

      const { data: me, error: meErr } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, role")
        .eq("email", email)
        .single();

      if (meErr || !me) {
        if (!cancelled) {
          toast({
            title: "Unauthorized",
            description: "User not found in employees table.",
            variant: "destructive",
          });
          navigate("/login");
        }
        return;
      }

      if ((me.role || "").toLowerCase() !== "manager") {
        if (!cancelled) {
          toast({
            title: "Access denied",
            description: "Manager role is required to access this portal.",
            variant: "destructive",
          });
          navigate("/login");
        }
        return;
      }

      if (!cancelled) {
        setManager(me as Employee);
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) navigate("/login");
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  // ---- Fetch helpers ----
  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, position, role, joining_date")
      .order("first_name", { ascending: true });
    if (!error && data) setEmployees(data as Employee[]);
  };

  const fetchAttendances = async () => {
    const { data, error } = await supabase
      .from("attendances")
      .select("*")
      .order("date", { ascending: false })
      .order("check_in", { ascending: false });
    if (!error && data) setAttendanceRecords(data as Attendance[]);
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, employee_id, message, read, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) setNotifications(data as NotificationRow[]);
  };

  const fetchSalaries = async () => {
    const { data, error } = await supabase
      .from("salary_structures")
      .select(
        "id, employee_id, employee_name, basic_salary, hours_worked, hourly_rate, overtime_hours, overtime_rate, allowances, deductions, gross_salary, net_salary, currency, country, effective_date, is_active, created_at, approval_status, payment_status"
      )
      .order("created_at", { ascending: false });
    if (!error && data) setSalaries(data as SalaryStructure[]);
  };

  useEffect(() => {
    if (!loading) {
      fetchEmployees();
      fetchAttendances();
      fetchNotifications();
      fetchSalaries();
    }
  }, [loading]);

  // ---- Logout ----
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged Out", description: "You have been successfully logged out" });
    navigate("/login");
  };

  // ---- Derived UI data ----
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);
  const todayAttendance = useMemo(
    () => attendanceRecords.filter((r) => r.date === todayISO),
    [attendanceRecords, todayISO]
  );

  const presentCount = todayAttendance.filter((r) => r.status === "present").length;
  const lateCount = todayAttendance.filter((r) => r.status === "late").length;
  const absentCount = Math.max(0, employees.length - (presentCount + lateCount));

  const managerStats = [
    {
      title: "Team Members",
      value: employees.length.toString(),
      change: "+2 this month",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Present Today",
      value: presentCount.toString(),
      change: `${((presentCount / Math.max(1, employees.length)) * 100).toFixed(1)}%`,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Late Arrivals",
      value: lateCount.toString(),
      change: "-2 from yesterday",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Absent",
      value: absentCount.toString(),
      change: "—",
      icon: Calendar,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  const teamPerformance = [
    { name: "On-time Rate", value: "92%", trend: "+3%" },
    { name: "Productivity", value: "88%", trend: "+5%" },
    { name: "Team Satisfaction", value: "94%", trend: "+2%" },
  ];

  // ============================================================
  //                 NEW — Employee CRUD handlers
  // ============================================================
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    first_name: "",
    last_name: "",
    email: "",
    position: "",
    role: "employee",
    joining_date: todayStr(),
  });

  const openCreateEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      first_name: "",
      last_name: "",
      email: "",
      position: "",
      role: "employee",
      joining_date: todayStr(),
    });
    setShowEmployeeModal(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      position: emp.position || "",
      role: emp.role || "employee",
      joining_date: emp.joining_date || todayStr(),
    });
    setShowEmployeeModal(true);
  };

  const saveEmployee = async () => {
    if (!empForm.first_name || !empForm.email) {
      toast({ title: "Missing data", description: "First name and email are required", variant: "destructive" });
      return;
    }
    if (editingEmployee) {
      const { error } = await supabase
        .from("employees")
        .update({
          first_name: empForm.first_name,
          last_name: empForm.last_name,
          email: empForm.email,
          position: empForm.position,
          role: empForm.role,
          joining_date: empForm.joining_date,
        })
        .eq("id", editingEmployee.id);
      if (error) {
        toast({ title: "Update failed", variant: "destructive" });
      } else {
        toast({ title: "Employee updated" });
        setShowEmployeeModal(false);
        fetchEmployees();
      }
    } else {
      const { error } = await supabase.from("employees").insert({
        first_name: empForm.first_name,
        last_name: empForm.last_name,
        email: empForm.email,
        position: empForm.position,
        role: empForm.role,
        joining_date: empForm.joining_date || todayStr(),
      });
      if (error) {
        toast({ title: "Create failed", variant: "destructive" });
      } else {
        toast({ title: "Employee created" });
        setShowEmployeeModal(false);
        fetchEmployees();
      }
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    const { error } = await supabase.from("employees").delete().eq("id", emp.id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
    } else {
      toast({ title: "Employee deleted" });
      fetchEmployees();
    }
  };

  // ============================================================
  //            NEW — Notifications: send / mark read
  // ============================================================
  const sendNotification = async () => {
    if (!notifEmployeeId || !notifMessage.trim()) {
      toast({ title: "Missing data", description: "Select an employee and enter a message", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("notifications").insert({
      employee_id: notifEmployeeId,
      message: notifMessage.trim(),
      read: false,
    });
    if (error) {
      toast({ title: "Failed to send", variant: "destructive" });
    } else {
      toast({ title: "Notification sent" });
      setShowNotificationModal(false);
      setNotifMessage("");
      setNotifEmployeeId(null);
      fetchNotifications();
    }
  };

  const markNotificationRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (!error) fetchNotifications();
  };

  // ============================================================
  //           NEW — Salary Structure: create & list
  // ============================================================
  const saveSalary = async () => {
    if (!salaryForm.employee_id || !salaryForm.employee_name) {
      toast({ title: "Missing data", description: "Employee is required", variant: "destructive" });
      return;
    }
    const { gross, net } = computeGrossNet({
      basic_salary: Number(salaryForm.basic_salary || 0),
      hours_worked: Number(salaryForm.hours_worked || 0),
      hourly_rate: Number(salaryForm.hourly_rate || 0),
      overtime_hours: Number(salaryForm.overtime_hours || 0),
      overtime_rate: Number(salaryForm.overtime_rate || 0),
      allowances: salaryForm.allowances || {},
      deductions: salaryForm.deductions || {},
    });

    const payload = {
      employee_id: salaryForm.employee_id,
      employee_name: salaryForm.employee_name,
      basic_salary: Number(salaryForm.basic_salary || 0),
      hours_worked: Number(salaryForm.hours_worked || 0),
      hourly_rate: Number(salaryForm.hourly_rate || 0),
      overtime_hours: Number(salaryForm.overtime_hours || 0),
      overtime_rate: Number(salaryForm.overtime_rate || 0),
      allowances: salaryForm.allowances || {},
      deductions: salaryForm.deductions || {},
      gross_salary: Number(gross.toFixed(2)),
      net_salary: Number(net.toFixed(2)),
      currency: salaryForm.currency || "USD",
      country: salaryForm.country || "USA",
      effective_date: salaryForm.effective_date || todayStr(),
      is_active: true,
      approval_status: "pending",
      payment_status: "pending",
    };

    const { error } = await supabase.from("salary_structures").insert(payload);
    if (error) {
      toast({ title: "Failed to save salary", variant: "destructive" });
    } else {
      toast({ title: "Salary structure created" });
      setShowSalaryModal(false);
      // reset minimal
      setSalaryForm((s) => ({
        ...s,
        employee_id: null,
        employee_name: "",
        basic_salary: 0,
        hours_worked: 0,
        hourly_rate: 0,
        overtime_hours: 0,
        overtime_rate: 0,
        allowances: { housing: 0, transport: 0 },
        deductions: { tax: 0, pension: 0 },
        currency: "USD",
        effective_date: todayStr(),
      }));
      fetchSalaries();
    }
  };

  // ============================================================
  //                            Render
  // ============================================================
  if (loading || !manager) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p className="text-lg">Loading Manager Portal…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-2 rounded-lg">
              <UserCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Manager Portal
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {manager.first_name} {manager.last_name}!
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Current Time</p>
              <p className="font-semibold">{currentTime.toLocaleTimeString()}</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {managerStats.map((stat, i) => (
            <Card key={i} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1">
                      {stat.change}
                    </Badge>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Performance & Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Team Performance</span>
              </CardTitle>
              <CardDescription>Key performance metrics for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {teamPerformance.map((metric, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{metric.name}</p>
                      <p className="text-2xl font-bold text-green-600">{metric.value}</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      {metric.trend}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Overview + NEW actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Team Overview</span>
              </CardTitle>
              <CardDescription>Current status of your team members</CardDescription>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={openCreateEmployee} className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Employee
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowNotificationModal(true)}
                  className="flex items-center gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Notifications
                  {unreadCount > 0 && <Badge className="ml-2">{unreadCount}</Badge>}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSalaryModal(true)}
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" /> Add Salary
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employees.slice(0, 5).map((emp) => {
                  const record = todayAttendance.find((r) => r.employee_id === emp.id);
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {emp.first_name?.[0] || "?"}
                          {emp.last_name?.[0] || ""}
                        </div>
                        <div>
                          <p className="font-medium">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-sm text-gray-600">{emp.position || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>
                          {record ? (record.status === "late" ? "Late" : "Present") : "Absent"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/employees/${emp.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* NEW: quick edit / delete */}
                        <Button variant="outline" size="sm" onClick={() => openEditEmployee(emp)} className="flex gap-1">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEmployee(emp)}
                          className="flex gap-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {employees.length === 0 && <div className="text-sm text-gray-500">No team members yet.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Team Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attendanceRecords.slice(0, 6).map((rec) => {
                const emp = employees.find((e) => e.id === rec.employee_id);
                return (
                  <div key={rec.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          rec.status === "present"
                            ? "bg-green-500"
                            : rec.status === "late"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">
                          {emp ? `${emp.first_name} ${emp.last_name}` : "Unknown Employee"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {rec.check_out ? "Checked out" : "Checked in"} at{" "}
                          {rec.check_out || rec.check_in || "N/A"}
                        </p>
                      </div>
                    </div>
                    <Badge>{rec.status}</Badge>
                  </div>
                );
              })}
              {attendanceRecords.length === 0 && (
                <div className="text-sm text-gray-500">No recent activity yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ====================== NEW: Salary Structures List ====================== */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              <span>Team Payroll (Recent)</span>
            </CardTitle>
            <CardDescription>Recently created salary structures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {salaries.slice(0, 8).map((s) => (
              <div key={s.id} className="border p-3 rounded flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.employee_name}</p>
                  <p className="text-xs text-gray-500">Effective: {s.effective_date}</p>
                  <p className="text-sm text-gray-700">
                    Base: {toCurrency(s.basic_salary, s.currency)} • Overtime: {toCurrency(overtimePay, s.currency)} •
                    Gross: <strong>{toCurrency(s.gross_salary, s.currency)}</strong> • Net:{" "}
                    <strong>{toCurrency(s.net_salary, s.currency)}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{s.approval_status}</Badge>
                  <Badge>{s.payment_status}</Badge>
                </div>
              </div>
            ))}
            {salaries.length === 0 && <div className="text-sm text-gray-500">No salary structures yet.</div>}
          </CardContent>
        </Card>

        {/* ====================== NEW: Notifications List ====================== */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>Messages sent to employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.slice(0, 10).map((n) => {
              const emp = employees.find((e) => e.id === n.employee_id);
              return (
                <div key={n.id} className="border p-3 rounded flex items-center justify-between">
                  <div>
                    <p className="font-medium">{n.message}</p>
                    <p className="text-xs text-gray-500">
                      {emp ? `${emp.first_name} ${emp.last_name}` : "Unknown"} •{" "}
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  {n.read ? (
                    <Badge variant="secondary">Read</Badge>
                  ) : (
                    <Button size="sm" onClick={() => markNotificationRead(n.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              );
            })}
            {notifications.length === 0 && <div className="text-sm text-gray-500">No notifications yet.</div>}
          </CardContent>
        </Card>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Employee Create/Edit */}
      <AlertDialog open={showEmployeeModal} onOpenChange={setShowEmployeeModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</AlertDialogTitle>
            <AlertDialogDescription>
              {editingEmployee ? "Update employee details" : "Create a new employee"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div>
              <label className="text-sm">First Name</label>
              <Input
                value={empForm.first_name || ""}
                onChange={(e) => setEmpForm((f) => ({ ...f, first_name: e.target.value }))}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="text-sm">Last Name</label>
              <Input
                value={empForm.last_name || ""}
                onChange={(e) => setEmpForm((f) => ({ ...f, last_name: e.target.value }))}
                placeholder="Last name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Email</label>
              <Input
                value={empForm.email || ""}
                onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@company.com"
                type="email"
              />
            </div>
            <div>
              <label className="text-sm">Position</label>
              <Input
                value={empForm.position || ""}
                onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))}
                placeholder="e.g., Developer"
              />
            </div>
            <div>
              <label className="text-sm">Role</label>
              <Select
                value={(empForm.role as string) || "employee"}
                onValueChange={(v) => setEmpForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Joining Date</label>
              <Input
                type="date"
                value={empForm.joining_date || todayStr()}
                onChange={(e) => setEmpForm((f) => ({ ...f, joining_date: e.target.value }))}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowEmployeeModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveEmployee}>{editingEmployee ? "Update" : "Create"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Notification */}
      <AlertDialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Notification</AlertDialogTitle>
            <AlertDialogDescription>Deliver a message to a team member</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm">Employee</label>
              <Select value={notifEmployeeId || ""} onValueChange={(v) => setNotifEmployeeId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} — {e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationModal(false)}>
              Cancel
            </Button>
            <Button onClick={sendNotification} className="flex items-center gap-2">
              <SendHorizonal className="h-4 w-4" />
              Send
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Salary Structure */}
      <AlertDialog open={showSalaryModal} onOpenChange={setShowSalaryModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Salary Structure</AlertDialogTitle>
            <AlertDialogDescription>
              Define base pay, allowances, deductions and effective date
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="md:col-span-2">
              <label className="text-sm">Employee</label>
              <Select
                value={(salaryForm.employee_id as string) || ""}
                onValueChange={(v) => {
                  const emp = employees.find((e) => e.id === v);
                  setSalaryForm((f) => ({
                    ...f,
                    employee_id: v,
                    employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} — {e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm">Basic Salary</label>
              <Input
                type="number"
                value={String(salaryForm.basic_salary ?? 0)}
                onChange={(e) => setSalaryForm((f) => ({ ...f, basic_salary: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm">Currency</label>
              <Input
                value={salaryForm.currency || "USD"}
                onChange={(e) => setSalaryForm((f) => ({ ...f, currency: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm">Hours Worked</label>
              <Input
                type="number"
                value={String(salaryForm.hours_worked ?? 0)}
                onChange={(e) => setSalaryForm((f) => ({ ...f, hours_worked: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm">Hourly Rate</label>
              <Input
                type="number"
                value={String(salaryForm.hourly_rate ?? 0)}
                onChange={(e) => setSalaryForm((f) => ({ ...f, hourly_rate: Number(e.target.value) }))}
              />
            </div>

            <div>
              <label className="text-sm">Overtime Hours</label>
              <Input
                type="number"
                value={String(salaryForm.overtime_hours ?? 0)}
                onChange={(e) => setSalaryForm((f) => ({ ...f, overtime_hours: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-sm">Overtime Rate</label>
              <Input
                type="number"
                value={String(salaryForm.overtime_rate ?? 0)}
                onChange={(e) => setSalaryForm((f) => ({ ...f, overtime_rate: Number(e.target.value) }))}
              />
            </div>

            {/* Allowances */}
            <div>
              <label className="text-sm">Allowances — Housing</label>
              <Input
                type="number"
                value={String((salaryForm.allowances?.housing as number) ?? 0)}
                onChange={(e) =>
                  setSalaryForm((f) => ({
                    ...f,
                    allowances: { ...(f.allowances || {}), housing: Number(e.target.value) },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-sm">Allowances — Transport</label>
              <Input
                type="number"
                value={String((salaryForm.allowances?.transport as number) ?? 0)}
                onChange={(e) =>
                  setSalaryForm((f) => ({
                    ...f,
                    allowances: { ...(f.allowances || {}), transport: Number(e.target.value) },
                  }))
                }
              />
            </div>

            {/* Deductions */}
            <div>
              <label className="text-sm">Deductions — Tax</label>
              <Input
                type="number"
                value={String((salaryForm.deductions?.tax as number) ?? 0)}
                onChange={(e) =>
                  setSalaryForm((f) => ({
                    ...f,
                    deductions: { ...(f.deductions || {}), tax: Number(e.target.value) },
                  }))
                }
              />
            </div>
            <div>
              <label className="text-sm">Deductions — Pension</label>
              <Input
                type="number"
                value={String((salaryForm.deductions?.pension as number) ?? 0)}
                onChange={(e) =>
                  setSalaryForm((f) => ({
                    ...f,
                    deductions: { ...(f.deductions || {}), pension: Number(e.target.value) },
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm">Effective Date</label>
              <Input
                type="date"
                value={salaryForm.effective_date || todayStr()}
                onChange={(e) => setSalaryForm((f) => ({ ...f, effective_date: e.target.value }))}
              />
            </div>

            {/* Live totals */}
            <div className="md:col-span-2 rounded-md border p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overtime Pay</span>
                <strong>{toCurrency(overtimePay, salaryForm.currency || "USD")}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Gross</span>
                <strong>{toCurrency(gross, salaryForm.currency || "USD")}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Net</span>
                <strong>{toCurrency(net, salaryForm.currency || "USD")}</strong>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowSalaryModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveSalary}>Save</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManagerPortal;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Fingerprint,
  UserCheck,
  TrendingUp,
  Activity,
  DollarSign,
  Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmployeeSearch from "@/components/EmployeeSearch";
import QuickActions from "@/components/QuickActions";
import LiveClock from "@/components/LiveClock";
import AttendanceWidget from "@/components/AttendanceWidget";
import DashboardNotifications from "@/components/DashboardNotifications";
import useLogout from "@/api/useLogout";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const logout = useLogout();
  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const init = async () => {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return navigate("/login");

      const { data: profile } = await supabase
        .from("employees")
        .select("*")
        .eq("id", authUser.user.id)
        .single();

      if (!profile || profile.role !== "admin") return navigate("/login");

      setUser(profile);

      const { data: emps } = await supabase.from("employees").select("*");
      if (emps) setEmployees(emps);

      const { data: attendance } = await supabase
        .from("attendances")
        .select("*");
      if (attendance) setAttendanceRecords(attendance);
    };

    init();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  if (!user) return null;

  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = attendanceRecords.filter(
    (record) => record.date === today
  );
  const presentCount = todayAttendance.filter(
    (record) => record.status === "present"
  ).length;
  const absentCount = employees.length - presentCount;
  const lateCount = todayAttendance.filter(
    (record) => record.status === "late"
  ).length;

  const stats = [
    {
      title: "Total Employees",
      value: employees.length.toString(),
      change: "+12%",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Present Today",
      value: presentCount.toString(),
      change: "+5%",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Absent Today",
      value: absentCount.toString(),
      change: "-3%",
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Late Arrivals",
      value: lateCount.toString(),
      change: "-8%",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  const recentActivities = attendanceRecords
    .slice(-5)
    .reverse()
    .map((record) => {
      const employee = employees.find((emp) => emp.id === record.employee_id);
      console.log("Employee Data", employee);
      return {
        name: employee
          ? `${employee.first_name} ${employee.last_name}`
          : "Unknown",
        action: record.check_out ? "Checked Out" : "Checked In",
        time: new Date(
          record.check_out || record.check_in
        ).toLocaleTimeString(),
        status:
          record.status === "present"
            ? "success"
            : record.status === "late"
            ? "warning"
            : "error",
      };
    });

  const attendanceRate =
    employees.length > 0
      ? ((presentCount / employees.length) * 100).toFixed(1)
      : "0.0";

  const weeklyStats = {
    avgAttendance: "94.5%",
    productivity: "88%",
    onTimeRate: "92%",
  };

  const navigationCards = [
    {
      title: "Users Management",
      description: "Manage system users and access control",
      icon: Users,
      path: "/users-management",
      color: "from-blue-600 to-blue-700",
    },
    {
      title: "Employee Management",
      description: "Manage employee profiles and information",
      icon: UserCheck,
      path: "/employee-management",
      color: "from-green-600 to-green-700",
    },
    {
      title: "Shifts Management",
      description: "Configure work shifts and schedules",
      icon: Clock,
      path: "/shifts-management",
      color: "from-purple-600 to-purple-700",
    },
    {
      title: "Salary Management",
      description: "Manage employee salary structures",
      icon: DollarSign,
      path: "/salary-management",
      color: "from-emerald-600 to-emerald-700",
    },
    // {
    //   title: "Payroll Management",
    //   description: "Process and manage employee payroll",
    //   icon: Receipt,
    //   path: "/payroll-management",
    //   color: "from-orange-600 to-orange-700"
    // },
    {
      title: "Attendance Tracking",
      description: "Mark attendance and view records",
      icon: Fingerprint,
      path: "/attendance",
      color: "from-red-600 to-red-700",
    },
    {
      title: "Reports & Analytics",
      description: "View comprehensive attendance reports",
      icon: BarChart3,
      path: "/reports",
      color: "from-indigo-600 to-indigo-700",
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: Settings,
      path: "/settings",
      color: "from-gray-600 to-gray-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Fingerprint className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AfraExpress Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user.first_name} {user.last_name}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Current Time</p>
                <p className="font-semibold">
                  {currentTime.toLocaleTimeString()}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={logout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {navigationCards.map((card, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="p-6">
                <div
                  className={`bg-gradient-to-r ${card.color} p-3 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Row - Live Clock and Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <LiveClock />
          </div>
          <div className="lg:col-span-3">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {weeklyStats.avgAttendance}
                    </div>
                    <div className="text-sm text-gray-600">
                      Weekly Attendance
                    </div>
                    <div className="flex items-center justify-center mt-1">
                      <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-xs text-green-600">+2.3%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {weeklyStats.productivity}
                    </div>
                    <div className="text-sm text-gray-600">Productivity</div>
                    <div className="flex items-center justify-center mt-1">
                      <Activity className="h-4 w-4 text-blue-600 mr-1" />
                      <span className="text-xs text-blue-600">+5.1%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {weeklyStats.onTimeRate}
                    </div>
                    <div className="text-sm text-gray-600">On-Time Rate</div>
                    <div className="flex items-center justify-center mt-1">
                      <CheckCircle className="h-4 w-4 text-purple-600 mr-1" />
                      <span className="text-xs text-purple-600">+1.8%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <Badge variant="secondary" className="mt-1">
                      {stat.change} from last week
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* Employee Search */}
            <EmployeeSearch />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Attendance */}
            <AttendanceWidget />

            {/* Notifications */}
            <DashboardNotifications />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Recent Activities</span>
              </CardTitle>
              <CardDescription>Latest attendance activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          activity.status === "success"
                            ? "bg-green-500"
                            : activity.status === "warning"
                            ? "bg-yellow-500"
                            : activity.status === "error"
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-gray-600">
                          {activity.action}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Today's Summary</span>
              </CardTitle>
              <CardDescription>
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Attendance Rate</span>
                  <span className="text-2xl font-bold text-green-600">
                    {attendanceRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full"
                    style={{ width: `${attendanceRate}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <p className="text-2xl font-bold text-green-600">
                      {presentCount}
                    </p>
                    <p className="text-sm text-gray-600">Present</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <p className="text-2xl font-bold text-red-600">
                      {absentCount}
                    </p>
                    <p className="text-sm text-gray-600">Absent</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

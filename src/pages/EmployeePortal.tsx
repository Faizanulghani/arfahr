// EmployeePortal.tsx
import { useCallback, useEffect, useRef, useState } from "react";
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
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
  Fingerprint,
  User,
  Activity,
  Timer,
  Coffee,
  MapPin,
  Bell,
  Settings,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UpcomingShifts from "./UpcomingShifts";

const EmployeePortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeVisible, setIframeVisible] = useState(false);
  const [scannerMode, setScannerMode] = useState<"check-in" | "check-out">(
    "check-in"
  );

  const [user, setUser] = useState<any>(null); // profile from users table
  const [currentUser, setCurrentUser] = useState<any>(null); // auth user
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<any[]>([]);

  // stats state
  const [hoursToday, setHoursToday] = useState<string>("0h");
  const [hoursThisWeek, setHoursThisWeek] = useState<string>("0h");

  // UI helper: manual attendance input
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Helpers ----------
  const startOfDayIso = (d = new Date()) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    return s.toISOString();
  };

  const endOfDayIso = (d = new Date()) => {
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    return e.toISOString();
  };

  const computeHoursForRecord = (record: any) => {
    if (!record?.check_in || !record?.check_out) return 0;
    const diff =
      new Date(record.check_out).getTime() -
      new Date(record.check_in).getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10; // 1 decimal
  };

  const recalcAndSetHours = (records: any[]) => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);

    let todayHrs = 0;
    let weekHrs = 0;

    records.forEach((r) => {
      if (r.check_in && r.check_out) {
        const ci = new Date(r.check_in);
        const hrs = computeHoursForRecord(r);
        if (ci >= todayStart) todayHrs += hrs;
        if (ci >= weekAgo) weekHrs += hrs;
      }
    });

    setHoursToday(`${Math.round(todayHrs * 10) / 10}h`);
    setHoursThisWeek(`${Math.round(weekHrs * 10) / 10}h`);
  };

  // Make sure there is an employees table row for the given user.
  // If missing, create one with safe default values so foreign key on attendances doesn't fail.
  const ensureEmployeeRow = async (userRow: any): Promise<any> => {
    // Try to find existing employee (match by email or fingerprint_id)
    const { data: emp, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .or(
        `email.eq.${userRow.email},fingerprint_id.eq.${
          userRow.fingerprint_id || ""
        }`
      )
      .limit(1)
      .maybeSingle();

    if (empErr) {
      console.error("employees lookup error:", empErr);
      return null;
    }
    if (emp) return emp;

    // create new minimal employee row (lots of NOT NULL fields — provide safe defaults)
    const [first = "", last = ""] = (
      userRow.full_name ||
      userRow.name ||
      ""
    ).split(" ");
    const newEmployee = {
      first_name: first || userRow.name || "Employee",
      last_name: last || "",
      email: userRow.email,
      phone: userRow.phone || "0000000000",
      address: userRow.address || "",
      position: userRow.position || "Employee",
      department: userRow.department || "General",
      salary: null,
      joining_date: new Date().toISOString().split("T")[0], // required
      employment_type: "full-time",
      emergency_contact: null,
      emergency_phone: null,
      biometric_data: userRow.biometric_data || null,
      has_agreed_to_terms: userRow.has_agreed_to_terms ?? true,
      fingerprint_id: userRow.fingerprint_id || null,
      biometric_templates: userRow.biometric_templates || null,
      raw_template: userRow.raw_template || null,
      raw_samples: userRow.raw_samples || null,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("employees")
      .insert(newEmployee)
      .select("*")
      .maybeSingle();

    if (insertErr) {
      console.error("Failed to insert employee fallback row:", insertErr);
      toast({
        title: "Error",
        description: "Failed to create employee record for attendance",
        variant: "destructive",
      });
      return null;
    }
    return inserted;
  };

  // ---------- Fetch / refresh ----------
  // const fetchAttendanceData = async () => {
  //   if (!user) return;
  //   const { data } = await supabase
  //     .from("attendances")
  //     .select("*")
  //     .eq("employee_id", user.id)
  //     .order("check_in", { ascending: true });

  //   const records = data || [];
  //   setAttendanceRecords(records);
  //   recalcAndSetHours(records);
  // };

  const fetchAttendanceData = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("attendances")
      .select("*")
      .eq("employee_id", user.id)
      .order("check_in", { ascending: true });

    const records = data || [];
    setAttendanceRecords(records);
    recalcAndSetHours(records);
  }, [user?.id]);

  // Fetch notifications
  const fetchNotifications = async (employeeId: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }
    setNotifications(data || []);
  };

  // ---------- Authentication & initial load ----------
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return navigate("/login");

      setCurrentUser(user);

      // Fetch employee profile by email instead of id from "employees" table
      const { data: profile, error: profileErr } = await supabase
        .from("employees")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (profileErr || !profile) {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        return navigate("/login");
      }

      // Role check
      if (profile.role !== "employee") {
        toast({
          title: "Access Denied",
          description: "You are not authorized to access this portal.",
          variant: "destructive",
        });
        return navigate("/login");
      }

      setUser(profile);

      // Load attendance
      await fetchNotifications(profile.id);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAttendanceData();
  }, [user]);

  // ---------- Logout ----------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged Out", description: "You have been logged out." });
    navigate("/login");
  };

  // ---------- Fingerprint scanner overlay & messaging ----------
  const openFingerprintScanner = async (mode: "check-in" | "check-out") => {
    setScannerMode(mode);
    setIframeVisible(true);
    setIsProcessingScan(true);

    try {
      // Step 1: Fetch all employees with biometric data
      const { data: usersWithBio, error } = await supabase
        .from("employees")
        .select("id, first_name, email, biometric_data, fingerprint_id")
        .not("fingerprint_id", "is", null);

      if (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Could not load biometric users",
          variant: "destructive",
        });
        setIsProcessingScan(false);
        return;
      }

      console.log(
        "✅ Loaded employees from Supabase:",
        usersWithBio?.length || 0
      );

      // Step 2: Wait until iframe is loaded fully before posting data
      const waitForIframeLoad = () =>
        new Promise<void>((resolve) => {
          if (iframeRef.current?.contentWindow) return resolve();
          iframeRef.current?.addEventListener("load", () => resolve(), {
            once: true,
          });
        });

      await waitForIframeLoad();

      // Step 3: Post employee list safely AFTER iframe load
      iframeRef.current?.contentWindow?.postMessage(
        { type: "employees", data: usersWithBio || [] },
        window.location.origin
      );

      console.log("👥 Sent employee list:", (usersWithBio || []).length);

      // Step 4: Give scanner 500ms to initialize
      await new Promise((res) => setTimeout(res, 500));

      toast({
        title: "Scanner Ready",
        description: "Place your finger on the scanner now.",
      });
    } catch (err) {
      console.error("Error initializing scanner:", err);
      toast({
        title: "Error",
        description: "Scanner failed to initialize",
        variant: "destructive",
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Handle messages from the iframe scanner
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        console.warn("Ignoring event from origin", event.origin);
        return;
      }

      const data = event.data;
      if (!data || !data.type) return;

      // fingerprint-attendance: { type, status, employee, image }
      if (data.type === "fingerprint-attendance") {
        setIsProcessingScan(true);
        const { status, employee: matchedEmployee } = data;

        if (status !== "match" || !matchedEmployee?.id) {
          toast({
            title: "No Match",
            description: "Fingerprint not recognized",
            variant: "destructive",
          });
          setIsProcessingScan(false);
          return;
        }

        try {
          const { data: empRow } = await supabase
            .from("employees")
            .select("*")
            .eq("fingerprint_id", matchedEmployee.fingerprint_id)
            .limit(1)
            .maybeSingle();

          let targetEmployee;
          if (!empRow) {
            toast({
              title: "Fingerprint not linked",
              description: "No employee found for this fingerprint",
              variant: "destructive",
            });
            return;
          }

          if (empRow) {
            targetEmployee = empRow;
          } else {
            // attempt to ensure employee row exists (create fallback using users table data)
            targetEmployee = await ensureEmployeeRow(matchedEmployee);
            if (!targetEmployee) {
              throw new Error("Could not create/find employee record");
            }
          }

          // Mark attendance by using the employee.id (FK)
          await markAttendanceForEmployeeId(targetEmployee.id, matchedEmployee);
        } catch (err) {
          console.error("Error processing biometric match:", err);
          toast({
            title: "Error",
            description: "Failed to record attendance",
            variant: "destructive",
          });
        } finally {
          setIsProcessingScan(false);
          setIframeVisible(false);
        }
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ---------- Attendance logic ----------
  // Mark attendance by employees.id (this avoids FK errors). matchedUser param is optional; if provided we show name
  const markAttendanceForEmployeeId = async (
    employeeId: string,
    matchedUser?: any
  ) => {
    const now = new Date();
    const start = startOfDayIso(now);
    const end = endOfDayIso(now);

    // find today's record for that employee
    const { data: todayRec, error: recErr } = await supabase
      .from("attendances")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("check_in", start)
      .lt("check_in", end)
      .maybeSingle();

    if (recErr) {
      console.error("Error checking today's attendance:", recErr);
      toast({
        title: "Error",
        description: "Could not check attendance",
        variant: "destructive",
      });
      return;
    }

    if (!todayRec) {
      // create check-in
      const { error: insErr } = await supabase.from("attendances").insert({
        employee_id: employeeId,
        check_in: now.toISOString(),
        status: "checked_in",
      });

      if (insErr) {
        console.error("Insert attendance error:", insErr);
        toast({
          title: "Error",
          description: "Failed to check in",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: `Checked In`,
        description: `Welcome ${
          matchedUser?.first_name || matchedUser?.full_name || ""
        }`,
      });
    } else if (!todayRec.check_out) {
      // update check-out
      const nowIso = now.toISOString();
      const totalHours = +(
        (new Date(nowIso).getTime() - new Date(todayRec.check_in).getTime()) /
        3600000
      ).toFixed(2);

      const { error: updErr } = await supabase
        .from("attendances")
        .update({
          check_out: nowIso,
          total_hours: totalHours,
          status: "checked_out",
        })
        .eq("id", todayRec.id);

      if (updErr) {
        console.error("Update attendance error:", updErr);
        toast({
          title: "Error",
          description: "Failed to check out",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: `Checked Out`,
        description: `Goodbye ${
          matchedUser?.first_name || matchedUser?.full_name || ""
        }`,
      });
    } else {
      toast({ title: `Already checked out`, variant: "destructive" });
    }

    // refresh
    await fetchAttendanceData();

    setUser((prev) => ({ ...prev }));
  };

  // Mark attendance by user id (manual input). This will locate the associated employees row first (create if missing).
  const markAttendance = async (employeeId: string) => {
    // 1️⃣ Fetch employee directly by ID
    const { data: employeeRow, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .maybeSingle();

    if (empErr || !employeeRow) {
      toast({ title: "Employee not found", variant: "destructive" });
      return;
    }

    // 2️⃣ Directly mark attendance using the employee record
    await markAttendanceForEmployeeId(employeeRow.id, employeeRow);
  };

  // ---------- Recent activity computed array ----------
  const recentActivity = (attendanceRecords || [])
    .slice(-10)
    .reverse()
    .map((record: any) => ({
      date: record.check_in
        ? record.check_in.split("T")[0]
        : record.created_at?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
      checkIn: record.check_in
        ? new Date(record.check_in).toLocaleTimeString()
        : null,
      checkOut: record.check_out
        ? new Date(record.check_out).toLocaleTimeString()
        : null,
      status: record.status || (record.check_out ? "present" : "present"),
      hours: computeHoursForRecord(record),
    }));

  // Today's record quick finder
  const todayRecord = attendanceRecords.find((r) => {
    if (!r.check_in) return false;
    const ci = new Date(r.check_in);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return ci >= start && ci <= end;
  });

  // ---------- Render ----------
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Employee Portal
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.first_name} {user.last_name}!
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
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Attendance Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Fingerprint className="h-6 w-6 text-purple-600" />
                <span>Attendance</span>
              </CardTitle>
              <CardDescription>Mark your attendance for today</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Check-in Time</p>
                  <p className="text-lg font-semibold">
                    {todayRecord?.check_in
                      ? new Date(todayRecord.check_in).toLocaleTimeString()
                      : "Not checked in"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out Time</p>
                  <p className="text-lg font-semibold">
                    {todayRecord?.check_out
                      ? new Date(todayRecord.check_out).toLocaleTimeString()
                      : "Not checked out"}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => openFingerprintScanner("check-in")}
                  disabled={isProcessingScan || Boolean(todayRecord?.check_in)}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700"
                >
                  <Fingerprint className="h-4 w-4 mr-2" /> Check In (Biometric)
                </Button>

                <Button
                  onClick={() => openFingerprintScanner("check-out")}
                  disabled={
                    isProcessingScan ||
                    !todayRecord?.check_in ||
                    Boolean(todayRecord?.check_out)
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <Fingerprint className="h-4 w-4 mr-2" /> Check Out (Biometric)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-6 w-6 text-blue-600" />
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge variant={todayRecord ? "default" : "secondary"}>
                    {todayRecord ? "Present" : "Absent"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Hours Today</span>
                  <span className="font-semibold">{hoursToday}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">This Week</span>
                  <span className="font-semibold">{hoursThisWeek}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Break Time</span>
                  <span className="font-semibold">45min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Attendance</span>
            </CardTitle>
            <CardDescription>Your attendance history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-4 h-4 rounded-full ${
                        activity.status === "present"
                          ? "bg-green-500"
                          : activity.status === "late"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {activity.checkIn
                          ? `In: ${activity.checkIn}`
                          : "No check-in"}
                        {activity.checkOut
                          ? ` | Out: ${activity.checkOut}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        activity.status === "present" ? "default" : "secondary"
                      }
                    >
                      {activity.status}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.hours}h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Notifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>
              Latest updates about payroll and attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications yet.</p>
              ) : (
                notifications.map((note, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-gray-800">{note.message}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!note.read && <Badge variant="secondary">New</Badge>}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Shifts */}
        <UpcomingShifts />

        {/* Manual Marking */}
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Manual Attendance</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter User ID"
              className="border rounded px-3 py-2 w-full text-sm"
              id="manual-user-id"
            />
            <Button
              onClick={() => {
                const id = (
                  document.getElementById("manual-user-id") as HTMLInputElement
                )?.value.trim();
                if (!id) {
                  toast({
                    title: "Please enter a valid User ID",
                    variant: "destructive",
                  });
                  return;
                }
                markAttendance(id);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Mark
            </Button>
          </div>
        </div>
      </div>

      {/* Scanner iframe overlay */}
      {iframeVisible && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[420px] h-[560px] rounded-lg shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center space-x-2">
                <Fingerprint className="h-5 w-5 text-purple-600" />
                <span className="font-medium">Fingerprint Scanner</span>
              </div>
              <div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIframeVisible(false);
                    setIsProcessingScan(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>

            <iframe
              ref={iframeRef}
              title="Fingerprint Scanner"
              src={`/fingerprint/index.html?mode=attendance`}
              className="w-full h-full border-0"
            />

            <div className="p-3 border-t flex items-center justify-between">
              <div>
                <p className="text-sm">
                  Mode: <strong>{scannerMode}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Place your finger on the scanner
                </p>
              </div>
              <div>
                {isProcessingScan ? (
                  <span className="text-sm">Processing...</span>
                ) : (
                  <span className="text-sm">Ready</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePortal;

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  Fingerprint as FingerIcon,
  Clock,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  AlertTriangle
} from "lucide-react";

import "dayjs/locale/en";
dayjs.extend(utc);

const AttendanceScanner = () => {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [mode, setMode] = useState<"check-in" | "check-out" | null>(null);
  const [status, setStatus] = useState("🟢 Ready");
  const [employeeId, setEmployeeId] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [missedAlerts, setMissedAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = async () => {
    const start = dayjs().startOf("day").toISOString();
    const end = dayjs().endOf("day").toISOString();
    const { data } = await supabase
      .from("attendances")
      .select("*, employees(first_name, last_name)")
      .gte("check_in", start)
      .lte("check_in", end)
      .order("check_in", { ascending: false });
    setAttendanceRecords(data || []);
  };

  const loadMissedAlerts = async () => {
    const { data: employees } = await supabase
      .from("employees")
      .select("id, first_name, last_name");

    const todayStart = dayjs().startOf("day").toISOString();
    const todayEnd = dayjs().endOf("day").toISOString();

    const { data: attendance } = await supabase
      .from("attendances")
      .select("employee_id")
      .gte("check_in", todayStart)
      .lte("check_in", todayEnd);

    const attendedIds = new Set((attendance || []).map((a) => a.employee_id));

    const missed = (employees || []).filter((emp) => !attendedIds.has(emp.id));
    setMissedAlerts(missed);
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type !== "fingerprint-attendance") return;
      if (!mode || !scannerVisible) return;

      const { status: matchStatus, employee } = e.data;

      if (matchStatus !== "match" || !employee) {
        toast({ title: "Not Recognized", description: "Fingerprint not matched", variant: "destructive" });
        setStatus("❌ Fingerprint not recognized");
        return;
      }

      const now = dayjs();
      const displayName = `${employee.first_name} ${employee.last_name}`;

      if (mode === "check-in") {
        const { data: existing } = await supabase
          .from("attendances")
          .select("id")
          .eq("employee_id", employee.id)
          .is("check_out", null)
          .maybeSingle();

        if (existing) {
          toast({ title: "Already Checked In", variant: "destructive" });
          setStatus("⚠️ Already checked in");
          return;
        }

        await supabase.from("attendances").insert({
          employee_id: employee.id,
          check_in: now.toISOString(),
          status: "checked_in"
        });

        toast({ title: "Checked In", description: `${displayName} checked in.` });
        setStatus("✅ Checked in");
        setScannerVisible(false);
        loadTodayAttendance();
        loadMissedAlerts();
      }

      if (mode === "check-out") {
        const { data: last } = await supabase
          .from("attendances")
          .select("*")
          .eq("employee_id", employee.id)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!last) {
          toast({ title: "No Active Check-In", variant: "destructive" });
          setStatus("⚠️ No active check-in");
          return;
        }

        const checkOutTime = dayjs();
        const total = Number(checkOutTime.diff(dayjs.utc(last.check_in), "minute") / 60).toFixed(2);

        await supabase.from("attendances").update({
          check_out: checkOutTime.toISOString(),
          total_hours: total,
          status: "checked_out"
        }).eq("id", last.id);

        toast({ title: "Checked Out", description: `${displayName} — ${total} hrs` });
        setStatus("✅ Checked out");
        setScannerVisible(false);
        loadTodayAttendance();
        loadMissedAlerts();
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [mode, scannerVisible]);

  const handleManualEntry = async () => {
    if (!employeeId.trim()) {
      toast({ title: "Missing", description: "Please enter Employee ID", variant: "destructive" });
      return;
    }

    await supabase.from("attendances").insert({
      employee_id: employeeId,
      check_in: new Date().toISOString(),
      status: "manual_checkin"
    });

    toast({ title: "Manual Entry", description: `Attendance for ${employeeId} saved.` });
    setEmployeeId("");
    loadTodayAttendance();
    loadMissedAlerts();
  };

  const startScanner = async (type: "check-in" | "check-out") => {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, biometric_data")
      .not("biometric_data", "is", null);

    setMode(type);
    setScannerVisible(true);
    setStatus(`👉 Place finger to ${type}`);

    setTimeout(() => {
      const iframe = document.querySelector("iframe");
      iframe?.contentWindow?.postMessage({ type: "employees", data }, "*");
    }, 500);
  };

  const today = currentTime.toLocaleDateString();

  const filteredRecords = attendanceRecords.filter(r => {
    const name = `${r.employees?.first_name || ""} ${r.employees?.last_name || ""}`.toLowerCase();
    return (
      searchQuery === "" ||
      name.includes(searchQuery.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">Attendance</h2>
              <p className="text-gray-600">{currentTime.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            Status: <span className="font-medium">{status}</span>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Button onClick={() => startScanner("check-in")}>📥 Check In</Button>
          <Button variant="outline" onClick={() => startScanner("check-out")}>📤 Check Out</Button>
          <Button variant="destructive" onClick={() => { setShowAlerts(!showAlerts); loadMissedAlerts(); }}>
            <AlertTriangle className="w-4 h-4 mr-1" /> Alerts
          </Button>
        </div>

        {showAlerts && missedAlerts.length > 0 && (
          <div className="bg-yellow-100 border border-yellow-300 p-4 rounded">
            <h4 className="font-semibold mb-2 text-yellow-800">⚠️ Missed Check-ins</h4>
            <ul className="list-disc list-inside text-sm text-yellow-900">
              {missedAlerts.map((emp) => (
                <li key={emp.id}>{emp.first_name} {emp.last_name}</li>
              ))}
            </ul>
          </div>
        )}

        {scannerVisible && (
          <iframe
            src="/fingerprint/index.html?mode=attendance"
            title="Scanner"
            className="w-full h-[400px] border rounded-lg"
          />
        )}

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5" /> Manual Entry
          </h3>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
            <Button onClick={handleManualEntry}>Submit</Button>
          </div>
        </div>


{/* Alerts Section */}
<div className="bg-white rounded-xl shadow p-6 space-y-4">
  <h3 className="text-lg font-semibold flex items-center gap-2">
    ⚠️ Attendance Alerts
  </h3>
  <div className="space-y-2">
    <Button
      variant="destructive"
      onClick={async () => {
        const todayStart = dayjs().startOf("day").toISOString();
        const todayEnd = dayjs().endOf("day").toISOString();

        const { data: allEmployees } = await supabase
          .from("employees")
          .select("id, first_name, last_name");

        const { data: checkIns } = await supabase
          .from("attendances")
          .select("employee_id, check_out")
          .gte("check_in", todayStart)
          .lte("check_in", todayEnd);

        const checkedInIds = checkIns.map((r) => r.employee_id);
        const notCheckedIn = allEmployees?.filter(
          (e) => !checkedInIds.includes(e.id)
        );

        const notCheckedOut = checkIns
          .filter((r) => !r.check_out)
          .map((r) => r.employee_id);

        const notCheckedOutEmployees = allEmployees?.filter((e) =>
          notCheckedOut.includes(e.id)
        );

        const alertText = `
🟥 Missed Check-Ins:
${notCheckedIn?.map((e) => `• ${e.first_name} ${e.last_name}`).join("\n") || "None"}

🟦 Missed Check-Outs:
${notCheckedOutEmployees
  ?.map((e) => `• ${e.first_name} ${e.last_name}`)
  .join("\n") || "None"}
        `;

        alert(alertText.trim());
      }}
    >
      Show Alerts
    </Button>
  </div>
</div>



        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Today's Attendance ({today})
          </h3>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search name or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredRecords.length === 0 ? (
              <p className="text-sm text-gray-500">No records today</p>
            ) : (
              filteredRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {r.check_out ? (
                      <CheckCircle className="text-green-600 w-4 h-4" />
                    ) : (
                      <XCircle className="text-yellow-600 w-4 h-4" />
                    )}
                    <div>
                      <p className="font-medium">
                        {r.employees?.first_name} {r.employees?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{r.employee_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {dayjs.utc(r.check_in).local().format("hh:mm A")}
                    </p>
                    <Badge>{r.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScanner;

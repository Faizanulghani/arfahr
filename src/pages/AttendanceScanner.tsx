import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

type AttendanceType = "check-in" | "check-out";

interface AttendanceDetails {
  status: string;
  employee_name: string;
  check_in: string;
  check_out?: string;
  total_hours?: number;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  biometric_data: string;
}

const AttendanceScanner = () => {
  const [scannerVisible, setScannerVisible] = useState(false);
  const [mode, setMode] = useState<AttendanceType | null>(null);
  const [status, setStatus] = useState("🟢 Ready");
  const [attendance, setAttendance] = useState<AttendanceDetails | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // ✅ Listen for fingerprint result
  useEffect(() => {
    const handleScan = async (e: MessageEvent) => {
      if (e.data?.type !== "fingerprint-attendance") return;
      if (!mode || !scannerVisible) return;

      const { status: matchStatus, employee, image } = e.data;
      console.log("📥 Received fingerprint-attendance:", e.data);

      setStatus("🔍 Matching fingerprint...");

      if (matchStatus === "no_match" || !employee) {
        toast({
          title: "Not Recognized",
          description: "Fingerprint not matched",
          variant: "destructive",
        });
        setStatus("❌ Fingerprint not recognized");
        return;
      }

      const matchedEmployee = employee;
      const displayName = `${matchedEmployee.first_name} ${matchedEmployee.last_name}`;
      const now = dayjs();

      // ✅ Check-In
      if (mode === "check-in") {
        const { data: existingCheckIn } = await supabase
          .from("attendances")
          .select("*")
          .eq("employee_id", matchedEmployee.id)
          .is("check_out", null)
          .maybeSingle();

        if (existingCheckIn) {
          toast({
            title: "Already Checked In",
            description: "Employee must check out before checking in again.",
            variant: "destructive",
          });
          setStatus("⚠️ Already checked in");
          return;
        }

        const { data, error } = await supabase
          .from("attendances")
          .insert([
            {
              employee_id: matchedEmployee.id,
              check_in: now.toISOString(),
              status: "checked_in",
            },
          ])
          .select()
          .single();

        if (error || !data) {
          toast({ title: "Check-In Failed", variant: "destructive" });
          setStatus("❌ Check-In failed");
        } else {
          setAttendance({
            status: "checked_in",
            employee_name: displayName,
            check_in: data.check_in,
          });

          toast({
            title: "Checked In",
            description: `${displayName} at ${dayjs
              .utc(data.check_in)
              .local()
              .format("hh:mm A")}`,
          });

          setStatus("✅ Checked in");
          setScannerVisible(false);

          setTimeout(() => {
            setAttendance(null);
            setStatus("🟢 Ready");
            setScannerVisible(true);
            setMode(null);
          }, 6000);
        }
      }

      // ✅ Check-Out
      if (mode === "check-out") {
        const { data: lastAttendance } = await supabase
          .from("attendances")
          .select("*")
          .eq("employee_id", matchedEmployee.id)
          .is("check_out", null)
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastAttendance) {
          toast({
            title: "Check-Out Failed",
            description: "No active check-in found",
            variant: "destructive",
          });
          setStatus("⚠️ No check-in session");
          return;
        }

        const checkInTime = dayjs.utc(lastAttendance.check_in);
        const checkOutTime = dayjs();
        const totalHours = Number(
          checkOutTime.diff(checkInTime, "minute") / 60
        ).toFixed(2);

        const { error } = await supabase
          .from("attendances")
          .update({
            check_out: checkOutTime.toISOString(),
            status: "checked_out",
            total_hours: parseFloat(totalHours),
          })
          .eq("id", lastAttendance.id);

        if (error) {
          toast({ title: "Check-Out Failed", variant: "destructive" });
          setStatus("❌ Check-Out failed");
        } else {
          setAttendance({
            status: "checked_out",
            employee_name: displayName,
            check_in: lastAttendance.check_in,
            check_out: checkOutTime.toISOString(),
            total_hours: parseFloat(totalHours),
          });

          toast({
            title: "Checked Out",
            description: `${displayName} — ${totalHours} hrs`,
          });

          setStatus("✅ Checked out");
          setScannerVisible(false);

          setTimeout(() => {
            setAttendance(null);
            setStatus("🟢 Ready");
            setScannerVisible(true);
            setMode(null);
          }, 6000);
        }
      }
    };

    window.addEventListener("message", handleScan);
    return () => window.removeEventListener("message", handleScan);
  }, [mode, scannerVisible]);

  // ✅ On Check In / Out, load employees and start scanner
  const startScanner = async (type: AttendanceType) => {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name, biometric_data")
      .not("biometric_data", "is", null);

    setEmployees(data || []);
    setMode(type);
    setScannerVisible(true);
    setStatus(
      `👉 Please place your thumb to ${
        type === "check-in" ? "Check-In" : "Check-Out"
      }`
    );

    // ✅ Send to iframe
    setTimeout(() => {
      const iframe = document.querySelector("iframe");
      iframe?.contentWindow?.postMessage(
        {
          type: "employees",
          data: data || [],
        },
        "*"
      );
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-xl p-8 space-y-6 border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          🕘 Attendance
        </h2>

        <div className="flex justify-center space-x-6">
          <Button onClick={() => startScanner("check-in")}>📥 Check In</Button>
          <Button variant="outline" onClick={() => startScanner("check-out")}>
            📤 Check Out
          </Button>
        </div>

        <div className="text-center text-sm text-gray-600">
          <span>Status:</span> <span className="font-medium">{status}</span>
        </div>

        {scannerVisible && (
          <iframe
            src="/fingerprint/index.html?mode=attendance"
            title="Fingerprint Scanner"
            className="w-full h-[400px] border border-gray-300 rounded-lg"
          />
        )}

        {attendance && (
          <div className="bg-gray-50 p-6 rounded-lg shadow-md space-y-3 border border-gray-200 mt-4">
            <div className="text-lg font-medium text-gray-800 flex items-center gap-2">
              👤 <span>{attendance.employee_name}</span>
            </div>
            <div className="text-sm text-gray-700">
              <strong>🕓 Check-In:</strong>{" "}
              {dayjs
                .utc(attendance.check_in)
                .local()
                .format("dddd, MMM D, YYYY | hh:mm A")}
            </div>
            {attendance.check_out && (
              <>
                <div className="text-sm text-gray-700">
                  <strong>🏁 Check-Out:</strong>{" "}
                  {dayjs
                    .utc(attendance.check_out)
                    .local()
                    .format("dddd, MMM D, YYYY | hh:mm A")}
                </div>
                <div className="text-sm text-gray-700">
                  <strong>⏱ Total Hours:</strong> {attendance.total_hours} hrs
                </div>
                <div className="text-sm text-green-700 font-semibold">
                  ✅ Status: {attendance.status}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScanner;

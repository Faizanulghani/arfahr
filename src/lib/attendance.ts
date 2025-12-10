import { supabase } from "@/lib/supabase";
import dayjs from "dayjs";

export async function markAttendance(employeeId: string, type: "check-in" | "check-out") {
  const now = dayjs();

  if (type === "check-in") {
    const { data: existingCheckIn } = await supabase
      .from("attendances")
      .select("*")
      .eq("employee_id", employeeId)
      .is("check_out", null)
      .maybeSingle();

    if (existingCheckIn) {
      throw new Error("Already checked in");
    }

    const { error } = await supabase.from("attendances").insert([{
      employee_id: employeeId,
      check_in: now.toISOString(),
      status: "checked_in",
    }]);

    if (error) throw error;
    return true;
  }

  if (type === "check-out") {
    const { data: lastAttendance } = await supabase
      .from("attendances")
      .select("*")
      .eq("employee_id", employeeId)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastAttendance) {
      throw new Error("No active check-in session");
    }

    const checkInTime = dayjs.utc(lastAttendance.check_in);
    const checkOutTime = dayjs();
    const totalHours = Number(checkOutTime.diff(checkInTime, "minute") / 60).toFixed(2);

    const { error } = await supabase
      .from("attendances")
      .update({
        check_out: checkOutTime.toISOString(),
        status: "checked_out",
        total_hours: parseFloat(totalHours),
      })
      .eq("id", lastAttendance.id);

    if (error) throw error;
    return true;
  }

  return false;
}

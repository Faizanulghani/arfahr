import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { t } from "i18next";

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  days_of_week: string[];
}

export default function UpcomingShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    // 1️⃣ Get current employee ID
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmployeeId(user.id);
        fetchShifts(user.id);
        setupRealtime(user.id);
      }
    };
    getUser();
  }, []);

  async function fetchShifts(empId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift_assignments")
      .select(
        `
        shift_id,
        shifts (
          id,
          name,
          start_time,
          end_time,
          break_duration,
          days_of_week
        )
      `
      )
      .eq("employee_id", empId);

    if (!error && data) {
      const mapped: Shift[] = data
        .map((row) => row.shifts) // array of shifts from each row
        .flat() // flatten into a single array
        .filter((shift): shift is Shift => Boolean(shift)); // remove null/undefined

      setShifts(mapped);
    }

    setLoading(false);
  }

  function setupRealtime(empId: string) {
    // 2️⃣ Listen for shift assignments changes
    supabase
      .channel(`shift-assignments-${empId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shift_assignments",
          filter: `employee_id=eq.${empId}`,
        },
        () => {
          fetchShifts(empId); // Refresh data
        }
      )
      .subscribe();
  }

  return (
    <Card className="bg-white shadow rounded-xl mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-purple-700">
          📅 {t("emloyeePortal:shifts.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-500">{t("emloyeePortal:shifts.loading")}</p>
        ) : shifts.length === 0 ? (
          <p className="text-gray-500">{t("emloyeePortal:shifts.noShifts")}</p>
        ) : (
          <ScrollArea className="h-48 pr-2">
            <div className="space-y-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <p className="font-semibold text-purple-700">{shift.name}</p>
                  <p className="text-sm text-gray-600">
                    {shift.start_time} - {shift.end_time} |{" "}
                    {t("emloyeePortal:shifts.break")}
                    {shift.break_duration} mins
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("emloyeePortal:shifts.days")}:{" "}
                    {shift.days_of_week.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

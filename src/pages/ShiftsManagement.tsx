import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@supabase/supabase-js";
import { Textarea } from "@/components/ui/textarea";
import { Search } from "lucide-react";
import { t } from "i18next";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ShiftManager() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    name: "",
    start_time: "",
    end_time: "",
    break_duration: 0,
    days_of_week: [],
    employee_ids: [],
  });
  const [editingId, setEditingId] = useState(null);

  async function fetchShifts() {
    const { data, error } = await supabase.rpc("get_shifts_with_employees");
    if (!error) setShifts(data);
  }

  async function fetchEmployees() {
    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name");
    setEmployees(data);
  }

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (
      !form.name ||
      !form.start_time ||
      !form.end_time ||
      form.days_of_week.length === 0
    )
      return;

    const shiftData = {
      name: form.name,
      start_time: form.start_time,
      end_time: form.end_time,
      break_duration: form.break_duration,
      days_of_week: form.days_of_week,
    };

    let shiftId = editingId;
    if (editingId) {
      const { error } = await supabase
        .from("shifts")
        .update(shiftData)
        .eq("id", editingId);
      if (error) return alert("Error updating shift");
    } else {
      const { data, error } = await supabase
        .from("shifts")
        .insert(shiftData)
        .select()
        .single();
      if (error) return alert("Error creating shift");
      shiftId = data.id;
    }

    await supabase.from("shift_assignments").delete().eq("shift_id", shiftId);
    if (form.employee_ids.length > 0) {
      const assignments = form.employee_ids.map((eid) => ({
        shift_id: shiftId,
        employee_id: eid,
      }));
      await supabase.from("shift_assignments").insert(assignments);
    }

    setForm({
      name: "",
      start_time: "",
      end_time: "",
      break_duration: 0,
      days_of_week: [],
      employee_ids: [],
    });
    setEditingId(null);
    fetchShifts();
  }

  function handleEdit(shift) {
    setForm({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_duration: shift.break_duration,
      days_of_week: shift.days_of_week,
      employee_ids: shift.employees.map((e) => e.id),
    });
    setEditingId(shift.id);
  }

  async function handleDelete(id) {
    if (confirm("Delete this shift?")) {
      await supabase.from("shifts").delete().eq("id", id);
      await supabase.from("shift_assignments").delete().eq("shift_id", id);
      fetchShifts();
    }
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50">
      {/* Header + Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-purple-600">
          {t("shiftsManagement:shift.title")}
        </h1>
        <div className="flex gap-2 w-full md:w-auto">
          <Input
            placeholder={t("shiftsManagement:shift.searchPlaceholder")}
            className="w-full md:w-64"
          />
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setEditingId(null)}
          >
            {t("shiftsManagement:shift.addShift")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow rounded-xl p-4 border">
          <h4 className="text-sm text-gray-500">
            {t("shiftsManagement:shift.stats.totalShifts")}
          </h4>
          <p className="text-2xl font-semibold text-purple-600">
            {shifts.length}
          </p>
        </Card>
        <Card className="bg-white shadow rounded-xl p-4 border">
          <h4 className="text-sm text-gray-500">
            {t("shiftsManagement:shift.stats.totalEmployees")}
          </h4>
          <p className="text-2xl font-semibold text-green-600">
            {employees.length}
          </p>
        </Card>
        <Card className="bg-white shadow rounded-xl p-4 border">
          <h4 className="text-sm text-gray-500">
            {t("shiftsManagement:shift.stats.assigned")}
          </h4>
          <p className="text-2xl font-semibold text-orange-600">
            {shifts.filter((s) => s.employees.length > 0).length}
          </p>
        </Card>
        <Card className="bg-white shadow rounded-xl p-4 border">
          <h4 className="text-sm text-gray-500">
            {t("shiftsManagement:shift.stats.unassigned")}
          </h4>
          <p className="text-2xl font-semibold text-red-500">
            {shifts.filter((s) => s.employees.length === 0).length}
          </p>
        </Card>
      </div>

      {/* Form */}
      <Card className="bg-white shadow rounded-xl">
        <CardContent className="space-y-4 p-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingId
              ? t("shiftsManagement:shift.form.editTitle")
              : t("shiftsManagement:shift.form.createTitle")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("shiftsManagement:shift.form.shiftName")}</Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label>
                {t("shiftsManagement:shift.form.breakDuration")} (mins)
              </Label>
              <Input
                type="number"
                value={form.break_duration}
                onChange={(e) =>
                  handleChange("break_duration", Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label>{t("shiftsManagement:shift.form.startTime")}</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => handleChange("start_time", e.target.value)}
              />
            </div>
            <div>
              <Label>{t("shiftsManagement:shift.form.endTime")}</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => handleChange("end_time", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>{t("shiftsManagement:shift.form.daysOfWeek")}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {days.map((day) => (
                <Button
                  key={day}
                  variant={
                    form.days_of_week.includes(day) ? "default" : "outline"
                  }
                  onClick={() => {
                    if (form.days_of_week.includes(day)) {
                      handleChange(
                        "days_of_week",
                        form.days_of_week.filter((d) => d !== day)
                      );
                    } else {
                      handleChange("days_of_week", [...form.days_of_week, day]);
                    }
                  }}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("shiftsManagement:shift.form.assignEmployees")}</Label>
            <ScrollArea className="h-40 border rounded p-3">
              <div className="flex flex-col gap-2">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.employee_ids.includes(emp.id)}
                      onCheckedChange={() => {
                        if (form.employee_ids.includes(emp.id)) {
                          handleChange(
                            "employee_ids",
                            form.employee_ids.filter((id) => id !== emp.id)
                          );
                        } else {
                          handleChange("employee_ids", [
                            ...form.employee_ids,
                            emp.id,
                          ]);
                        }
                      }}
                    />
                    {emp.first_name} {emp.last_name}
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {editingId
              ? t("shiftsManagement:shift.form.updateButton")
              : t("shiftsManagement:shift.form.createButton")}
          </Button>
        </CardContent>
      </Card>

      {/* Shift Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((shift) => (
          <Card
            key={shift.id}
            className="bg-white shadow rounded-xl p-4 border"
          >
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-purple-700">
                  {shift.name}
                </h3>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(shift)}
                  >
                    {t("shiftsManagement:shift.card.edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(shift.id)}
                  >
                    {t("shiftsManagement:shift.card.delete")}
                  </Button>
                </div>
              </div>
              <p className="text-gray-700">
                {shift.start_time} - {shift.end_time} |{" "}
                {t("shiftsManagement:shift.card.break")}
                {shift.break_duration} mins
              </p>
              <p className="text-gray-600">
                {t("shiftsManagement:shift.card.days")}:{" "}
                {shift.days_of_week.join(", ")}
              </p>
              <div>
                <p className="font-medium text-sm text-gray-800">
                  {t("shiftsManagement:shift.card.employees")}:
                </p>
                <ul className="list-disc list-inside text-gray-700">
                  {shift.employees.map((e) => (
                    <li key={e.id}>{e.name}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

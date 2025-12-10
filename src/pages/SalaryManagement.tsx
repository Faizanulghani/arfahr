// SalaryManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Users,
  Calculator,
  TrendingUp,
  PiggyBank,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  AlertCircle,
  Download,
  FileText,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format as formatDate, parseISO, addDays } from "date-fns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/lib/supabase"; // use your existing supabase client

// --------------------- types ---------------------
interface SalaryStructure {
  id: string;
  employee_id?: string | null;
  employee_name: string;
  basic_salary: number;
  hours_worked?: number;
  hourly_rate?: number;
  overtime_hours?: number;
  overtime_rate?: number;
  allowances?: Record<string, number>;
  deductions?: Record<string, number>;
  gross_salary?: number;
  net_salary?: number;
  currency?: string;
  country?: string;
  effective_date: string; // date string
  is_active?: boolean;

  // existing fields in your schema:
  approval_status?: "pending" | "approved" | "rejected";
  payment_status?: "pending" | "processing" | "paid" | "failed";
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  payment_processed_at?: string | null;
  payment_reference?: string | null;
  payment_notes?: string | null;

  created_at?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  country?: string | null;
  currency?: string | null;
  same_day_enabled?: boolean | null; // optional field in employees (may be absent)
}

// --------------------- defaults & helpers ---------------------
const COUNTRY_DEFAULTS: Record<string, any> = {
  USA: {
    currency: "USD",
    overtime_multiplier: 1.5,
    fico_ss_pct: 6.2,
    fico_med_pct: 1.45,
    federal_tax_pct: 10,
    default_allowances: {
      house_rent: 0,
      transport: 0,
      medical: 0,
      food: 0,
      other: 0,
    },
    default_deductions: {
      social_security: 0,
      medicare: 0,
      federal_tax: 0,
      employer_contribution: 16,
      pension_contribution: 0,
      income_tax: 0,
      professional_tax: 0,
      health_insurance: 0,
      union_dues: 0,
    },
  },
  BF: {
    currency: "XOF",
    cnss_pct: 5.5,
    iuts_pct: 10,
    decimal_places: 0,
    rounding_method: "floor",
    default_allowances: {
      house_rent: 0,
      transport: 0,
      medical: 0,
      food: 0,
      other: 0,
    },
    default_deductions: {
      cnss: 0,
      iuts: 0,
      other: 0,
      employer_contribution_pct: 16,
      pension_contribution: 0,
      income_tax: 0,
      professional_tax: 0,
      health_insurance: 0,
      union_dues: 0,
    },
  },
};

const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  CFA: 0.0017,
  XOF: 0.0017,
  EUR: 1.1,
};

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const convertCurrency = (amount: number, from: string, to: string) => {
  if (!CURRENCY_RATES[from] || !CURRENCY_RATES[to]) return amount;
  const usdAmount = amount / CURRENCY_RATES[from]; // Convert to USD
  return usdAmount * CURRENCY_RATES[to]; // Convert to target
};

const getSalaryByFrequency = (
  gross: number,
  frequency: "hourly" | "monthly" | "yearly",
  hoursWorked: number = 160
) => {
  switch (frequency) {
    case "hourly":
      return gross / hoursWorked;
    case "monthly":
      return gross / 12;
    case "yearly":
    default:
      return gross;
  }
};

function getCurrentMonthSlug() {
  return MONTHS[new Date().getMonth()];
}
function getMonthRange(monthSlug: string, year: number) {
  const monthIndex = MONTHS.indexOf(monthSlug);
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0)); // exclusive
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

// Business-days buffer: for simplicity we add calendar days but clamp values (you can plug in a real business-days lib later)
function addBusinessDaysSimplified(iso: string, businessDays: number) {
  // naive but practical: add (businessDays + weekend corrections)
  let d = new Date(iso);
  let added = 0;
  while (added < businessDays) {
    d = addDays(d, 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d.toISOString();
}

// Try to insert a row into optional table (quietly fail if table doesn't exist)
async function tryInsertOptional(table: string, row: any) {
  try {
    await supabase.from(table).insert(row);
  } catch (e) {
    // ignore
  }
}

// --------------------- React component ---------------------
const SalaryManagement: React.FC = () => {
  const { toast } = useToast();

  // primary data
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(
    []
  );
  const [employees, setEmployees] = useState<Employee[]>([]);

  // UI/filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState<string>(getCurrentMonthSlug());

  // modal/form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [attendanceHoursByEmployee, setAttendanceHoursByEmployee] = useState<
    Record<string, number>
  >({});

  // small local audit log (client-side) for quick inspection
  const [clientAudit, setClientAudit] = useState<any[]>([]);

  // Status modal
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    type: "approval" | "payment";
    salaryId: string;
    currentStatus: string;
    newStatus: string;
    notes: string;
    reference: string;
  }>({
    open: false,
    type: "approval",
    salaryId: "",
    currentStatus: "",
    newStatus: "",
    notes: "",
    reference: "",
  });

  // Form state
  const [form, setForm] = useState({
    country: "USA",
    basic_salary: 0,
    hours_worked: 160,
    hourly_rate: 0,
    overtime_hours: 0,
    overtime_rate: 0,
    allowances: { ...COUNTRY_DEFAULTS.USA.default_allowances },
    deductions: { ...COUNTRY_DEFAULTS.USA.default_deductions },
    currency: COUNTRY_DEFAULTS.USA.currency,
    effective_date: new Date().toISOString().split("T")[0],
    is_active: true,

    // client-side policy fields (not stored in your DB schema)
    frequency: "weekly" as "weekly" | "biweekly" | "monthly",
    buffer_business_days: 2,
    off_cycle: false,
  });

  const [viewModal, setViewModal] = useState({ open: false, salary: null });

  // --------------------- fetch functions ---------------------
  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email")
        .order("first_name", { ascending: true });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err: any) {
      console.error("fetchEmployees error", err);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    }
  };

  const fetchSalaryStructures = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("salary_structures")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSalaryStructures((data || []) as SalaryStructure[]);
    } catch (err: any) {
      console.error("fetchSalaryStructures error", err);
      toast({
        title: "Error",
        description: "Failed to load salary structures",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // attendance aggregator for the selected month
  const fetchAttendanceForSelectedMonth = async () => {
    try {
      const year = new Date().getFullYear();
      const { startISO, endISO } = getMonthRange(filterMonth, year);

      const { data, error } = await supabase
        .from("attendances")
        .select("employee_id, check_in, check_out")
        .gte("check_in", startISO)
        .lt("check_in", endISO);

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const rec of (data || []) as any[]) {
        const empId = rec.employee_id as string;
        const ci = rec.check_in ? new Date(rec.check_in).getTime() : null;
        const co = rec.check_out ? new Date(rec.check_out).getTime() : null;
        if (!empId || !ci || !co) continue;
        const hours = Math.max(0, (co - ci) / (1000 * 60 * 60));
        map[empId] = (map[empId] || 0) + hours;
      }
      setAttendanceHoursByEmployee(map);
    } catch (err: any) {
      console.error("fetchAttendanceForSelectedMonth error", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchSalaryStructures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAttendanceForSelectedMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth, salaryStructures.length]);

  // --------------------- calculation helpers ---------------------
  const calcGross = (
    basic: number,
    allowances: Record<string, number>,
    overtimeAmount: number
  ) => {
    const totalAllowances = Object.values(allowances).reduce<number>(
      (sum, val) => sum + Number(val || 0),
      0
    );
    return Number(basic || 0) + totalAllowances + Number(overtimeAmount || 0);
  };

  const calcNet = (gross: number, deductions: Record<string, number>) => {
    const totalDeductions = Object.values(deductions).reduce<number>(
      (sum, val) => sum + Number(val || 0),
      0
    );
    return Number(gross || 0) - totalDeductions;
  };

  const computeOvertimeAmount = (
    hourly: number,
    overtimeHours: number,
    overtimeRate: number,
    countryDefaults: any
  ) => {
    const multiplier =
      overtimeRate || countryDefaults.overtime_multiplier || 1.5;
    if (multiplier <= 10 && multiplier >= 1) {
      return (
        Number(overtimeHours || 0) *
        Number(hourly || 0) *
        Number(multiplier || 1)
      );
    } else {
      return Number(overtimeHours || 0) * Number(multiplier || 0);
    }
  };

  const overtimeAmount = computeOvertimeAmount(
    form.hourly_rate,
    form.overtime_hours,
    form.overtime_rate,
    COUNTRY_DEFAULTS[form.country]
  );

  const grossInUSD = convertCurrency(
    calcGross(form.basic_salary, form.allowances, overtimeAmount),
    form.currency,
    "USD"
  );

  // --------------------- create / update ---------------------
  const resetFormForCountry = (country: string) => {
    const defaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS.USA;
    setForm((prev) => ({
      ...prev,
      country,
      currency: defaults.currency,
      overtime_rate: defaults.overtime_multiplier,
      allowances: { ...defaults.default_allowances },
      deductions: { ...defaults.default_deductions },
      frequency: "weekly",
      buffer_business_days: 2,
      off_cycle: false,
    }));
  };

  const openAddModal = () => {
    setEditId(null);
    setSelectedEmployeeIds([]);
    resetFormForCountry("USA");
    setForm((prev) => ({
      ...prev,
      basic_salary: 0,
      hours_worked: 160,
      effective_date: new Date().toISOString().split("T")[0],
    }));
    setIsModalOpen(true);
  };

  // When saving, only insert columns that exist in your schema
  const handleSave = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast({
        title: "Select employees",
        description: "Please select at least one employee",
        variant: "destructive",
      });
      return;
    }

    const defaults = COUNTRY_DEFAULTS[form.country] || COUNTRY_DEFAULTS.USA;
    const effDate =
      form.effective_date || new Date().toISOString().split("T")[0];

    const rowsToInsert: Partial<SalaryStructure>[] = [];

    for (const eid of selectedEmployeeIds) {
      const emp = employees.find((e) => e.id === eid);
      const employee_name = emp
        ? `${emp.first_name} ${emp.last_name}`
        : "Unknown";
      const overtimeAmount = computeOvertimeAmount(
        form.hourly_rate || 0,
        form.overtime_hours || 0,
        form.overtime_rate || defaults.overtime_multiplier,
        defaults
      );
      const gross = calcGross(
        form.basic_salary || 0,
        form.allowances as Record<string, number>,
        overtimeAmount
      );

      const dedCopy: Record<string, number> = {
        ...(form.deductions as Record<string, number>),
      };
      if (form.country === "USA") {
        const ss = ((defaults.fico_ss_pct || 0) / 100) * gross;
        const med = ((defaults.fico_med_pct || 0) / 100) * gross;
        dedCopy.social_security = Number((dedCopy.social_security || 0) + ss);
        dedCopy.medicare = Number((dedCopy.medicare || 0) + med);
        const fed = ((defaults.federal_tax_pct || 0) / 100) * gross;
      } else if (form.country === "BF") {
        const cnss = ((defaults.cnss_pct || 0) / 100) * gross;
        const iuts = ((defaults.iuts_pct || 0) / 100) * gross;
        dedCopy.cnss = Number((dedCopy.cnss || 0) + cnss);
        dedCopy.iuts = Number((dedCopy.iuts || 0) + iuts);
      }

      const net = calcNet(gross, dedCopy);

      rowsToInsert.push({
        employee_id: eid,
        employee_name,
        basic_salary: form.basic_salary,
        hours_worked: form.hours_worked,
        hourly_rate: form.hourly_rate,
        overtime_hours: form.overtime_hours,
        overtime_rate: form.overtime_rate,
        allowances: form.allowances,
        deductions: dedCopy,
        gross_salary: Number(gross.toFixed(2)),
        net_salary: Number(net.toFixed(2)),
        currency: form.currency,
        country: form.country,
        effective_date: effDate,
        is_active: form.is_active,
        // initial statuses (these columns exist)
        approval_status: "pending",
        payment_status: "pending",
      });
    }

    setLoading(true);
    const { error } = await supabase
      .from("salary_structures")
      .insert(rowsToInsert);
    setLoading(false);
    if (error) {
      console.error("Failed to insert salary structures", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save salary structures",
        variant: "destructive",
      });
      return;
    }

    // client audit & notification (best-effort)
    for (const r of rowsToInsert) {
      setClientAudit((prev) => [
        ...prev,
        {
          action: "create",
          entity: "salary_structures",
          entity_id: (r as any).id ?? "new",
          timestamp: new Date().toISOString(),
          payload: r,
        },
      ]);
      // Try to insert a notification row if your notifications table exists
      tryInsertOptional("notifications", {
        employee_id: r.employee_id,
        channel: "inapp",
        title: "Salary created",
        body: `A pay item for ${r.employee_name} for period ending ${r.effective_date} was created.`,
        created_at: new Date().toISOString(),
      });
    }

    toast({
      title: "Saved",
      description: `Salary structure saved for ${rowsToInsert.length} employee(s)`,
    });
    setIsModalOpen(false);
    await fetchSalaryStructures();
  };

  // --------------------- delete ---------------------
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salary structure?")) return;
    const { error } = await supabase
      .from("salary_structures")
      .delete()
      .eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
      return;
    }
    // best-effort audit table
    tryInsertOptional("audit_logs", {
      entity: "salary_structure",
      entity_id: id,
      action: "delete",
      diff: {},
      created_at: new Date().toISOString(),
    });
    toast({ title: "Deleted", description: "Salary structure removed" });
    await fetchSalaryStructures();
  };

  // --------------------- status changes (approval/payment) ---------------------
  const handleStatusChange = async (
    salaryId: string,
    type: "approval" | "payment",
    newStatus: string,
    notes?: string,
    reference?: string
  ) => {
    // find current item
    const current = salaryStructures.find((s) => s.id === salaryId);
    if (!current) {
      toast({
        title: "Error",
        description: "Salary not found",
        variant: "destructive",
      });
      return;
    }

    // fetch current user id
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
    } catch { }

    // default buffer (2 business days)
    const buffer = 2;

    const updateData: Record<string, any> = {};

    if (type === "approval") {
      if (newStatus === "approved") {
        updateData.approval_status = "approved";
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
        // compute scheduled release (approximate business-days)
        const scheduled_release_iso = addBusinessDaysSimplified(
          current.effective_date,
          buffer
        );
        const note = `Scheduled release (buffer ${buffer} business days): ${formatDate(
          parseISO(scheduled_release_iso),
          "yyyy-MM-dd"
        )}`;
        updateData.payment_notes =
          (current.payment_notes ? current.payment_notes + " | " : "") + note;

        // ✅ Notification (approval)
        await supabase.from("notifications").insert([
          {
            employee_id: current.employee_id,
            message: `Your payroll item for ${current.effective_date} was approved. ${note}`,
          },
        ]);
      } else if (newStatus === "rejected") {
        updateData.approval_status = "rejected";
        updateData.rejection_reason = notes || null;

        // ✅ Notification (rejected)
        await supabase.from("notifications").insert([
          {
            employee_id: current.employee_id,
            message: `Your payroll item for ${current.effective_date
              } was rejected. Reason: ${notes || "N/A"}`,
          },
        ]);
      } else {
        updateData.approval_status = "pending";
      }
    }

    if (type === "payment") {
      if (current.approval_status !== "approved") {
        toast({
          title: "Approval required",
          description: "Salary must be approved before payment processing",
          variant: "destructive",
        });
        return;
      }

      let scheduled_release_iso: string | null = null;
      if (current.payment_notes) {
        const m = current.payment_notes.match(
          /Scheduled release.*?:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/
        );
        if (m) {
          scheduled_release_iso = new Date(m[1]).toISOString();
        }
      }
      if (!scheduled_release_iso) {
        scheduled_release_iso = addBusinessDaysSimplified(
          current.effective_date,
          buffer
        );
      }

      const nowIso = new Date().toISOString();
      const employee = employees.find((e) => e.id === current.employee_id);
      const sameDayEnabled = !!employee?.same_day_enabled;

      if (newStatus === "processing") {
        updateData.payment_status = "processing";
        updateData.payment_processed_at = new Date().toISOString();
        if (reference) updateData.payment_reference = reference;
        updateData.payment_notes =
          (current.payment_notes ? current.payment_notes + " | " : "") +
          (notes || "Processing initiated");
      } else if (newStatus === "paid") {
        if (
          !sameDayEnabled &&
          new Date(nowIso) < new Date(scheduled_release_iso)
        ) {
          updateData.payment_status = "processing";
          updateData.payment_notes =
            (current.payment_notes ? current.payment_notes + " | " : "") +
            `Queued until scheduled release ${formatDate(
              parseISO(scheduled_release_iso),
              "yyyy-MM-dd"
            )}`;
          toast({
            title: "Queued",
            description: `Release scheduled on ${formatDate(
              parseISO(scheduled_release_iso),
              "MMM dd, yyyy"
            )}`,
          });
        } else {
          updateData.payment_status = "paid";
          updateData.payment_processed_at = new Date().toISOString();
          if (reference) updateData.payment_reference = reference;
          updateData.payment_notes =
            (current.payment_notes ? current.payment_notes + " | " : "") +
            (notes || "Paid");

          // paystub (best-effort)
          tryInsertOptional("paystubs", {
            salary_structure_id: current.id,
            employee_id: current.employee_id,
            period_end: current.effective_date,
            gross: current.gross_salary,
            net: current.net_salary,
            currency: current.currency,
            created_at: new Date().toISOString(),
          });

          // ✅ Notification (paid)
          await supabase.from("notifications").insert([
            {
              employee_id: current.employee_id,
              message: `Your salary for period ${current.effective_date} was released.`,
            },
          ]);
        }
      } else if (newStatus === "failed") {
        updateData.payment_status = "failed";
        updateData.payment_notes =
          (current.payment_notes ? current.payment_notes + " | " : "") +
          (notes || "Payment failed");

        tryInsertOptional("audit_logs", {
          entity: "salary_structure",
          entity_id: current.id,
          action: "payment_failed",
          diff: { note: notes || "" },
          created_at: new Date().toISOString(),
        });

        // ✅ Notification (failed)
        await supabase.from("notifications").insert([
          {
            employee_id: current.employee_id,
            message: `Payment attempt for ${current.effective_date} failed. We will retry.`,
          },
        ]);
      } else {
        updateData.payment_status = newStatus;
      }
    }

    // Write update to DB
    setLoading(true);
    const { data, error } = await supabase
      .from("salary_structures")
      .update(updateData)
      .eq("id", salaryId)
      .select("*")
      .single();
    setLoading(false);

    if (error) {
      console.error("Update error:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
      return;
    }

    setClientAudit((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        action: `${type}_${newStatus}`,
        salaryId,
        updateData,
      },
    ]);

    toast({
      title: "Status Updated",
      description: `${type === "approval" ? "Approval" : "Payment"
        } status updated to ${newStatus}`,
    });
    await fetchSalaryStructures();
  };

  // allow manual retry for failed payments: simple re-trigger to 'paid' which will validate scheduled release
  const retryPayment = async (salaryId: string) => {
    const s = salaryStructures.find((x) => x.id === salaryId);
    if (!s) return;
    // attempt to mark paid (will obey buffer/same-day)
    await handleStatusChange(salaryId, "payment", "paid", "Retry attempt");
  };

  // --------------------- bulk approval (single-step) ---------------------
  const handleBulkApproval = async (status: "approved" | "rejected") => {
    const pendingIds = salaryStructures
      .filter((s) => s.approval_status === "pending")
      .map((s) => s.id);
    if (pendingIds.length === 0) {
      toast({
        title: "No pending salaries",
        description: "No pending salary structures to approve/reject",
      });
      return;
    }
    if (
      !confirm(
        `${status === "approved" ? "Approve" : "Reject"} ${pendingIds.length
        } pending salary structures?`
      )
    )
      return;

    setLoading(true);

    if (status === "approved") {
      const approved_at = new Date().toISOString();
      try {
        const { error } = await supabase
          .from("salary_structures")
          .update({ approval_status: "approved", approved_at })
          .in("id", pendingIds);
        if (error) throw error;
        // add payment_notes about scheduled release (best-effort per-item)
        for (const id of pendingIds) {
          const item = salaryStructures.find((s) => s.id === id);
          if (!item) continue;
          const scheduled = addBusinessDaysSimplified(item.effective_date, 2);
          const note = `Scheduled release: ${formatDate(
            parseISO(scheduled),
            "yyyy-MM-dd"
          )}`;
          // append to payment_notes
          await supabase
            .from("salary_structures")
            .update({
              payment_notes:
                (item.payment_notes ? item.payment_notes + " | " : "") + note,
            })
            .eq("id", id);
        }
        toast({
          title: "Bulk Approved",
          description: `${pendingIds.length} items approved`,
        });
      } catch (err: any) {
        console.error("Bulk approval error", err);
        toast({
          title: "Error",
          description: "Bulk approval failed",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        await fetchSalaryStructures();
      }
    } else {
      // rejected
      try {
        const { error } = await supabase
          .from("salary_structures")
          .update({
            approval_status: "rejected",
            rejection_reason: "Bulk reject",
          })
          .in("id", pendingIds);
        if (error) throw error;
        toast({
          title: "Bulk Rejected",
          description: `${pendingIds.length} items rejected`,
        });
      } catch (err: any) {
        console.error("Bulk reject error", err);
        toast({
          title: "Error",
          description: "Bulk reject failed",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        await fetchSalaryStructures();
      }
    }
  };
  const decimalPlaces =
    COUNTRY_DEFAULTS[form.country]?.decimal_places ?? 2;
  // --------------------- form edit/update ---------------------
  const handleEdit = (id: string) => {
    const structure = salaryStructures.find((s) => s.id === id);
    if (!structure) return;
    setEditId(id);
    setSelectedEmployeeIds(
      structure.employee_id ? [structure.employee_id] : []
    );
    setForm({
      country: structure.country || "USA",
      basic_salary: Number(structure.basic_salary || 0),
      hours_worked: Number(structure.hours_worked || 0),
      hourly_rate: Number(structure.hourly_rate || 0),
      overtime_hours: Number(structure.overtime_hours || 0),
      overtime_rate: Number(structure.overtime_rate || 0),
      allowances: structure.allowances || {
        ...COUNTRY_DEFAULTS[structure.country || "USA"].default_allowances,
      },
      deductions: structure.deductions || {
        ...COUNTRY_DEFAULTS[structure.country || "USA"].default_deductions,
      },
      currency:
        structure.currency ||
        COUNTRY_DEFAULTS[structure.country || "USA"].currency,
      effective_date:
        structure.effective_date || new Date().toISOString().split("T")[0],
      is_active: structure.is_active ?? true,
      frequency: "weekly",
      buffer_business_days: 2,
      off_cycle: false,
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editId) return;

    const defaults = COUNTRY_DEFAULTS[form.country] || COUNTRY_DEFAULTS.USA;

    // Overtime calculation
    const overtimeAmount = computeOvertimeAmount(
      form.hourly_rate || 0,
      form.overtime_hours || 0,
      form.overtime_rate || defaults.overtime_multiplier,
      defaults
    );

    // Gross salary calculation
    const gross = calcGross(
      form.basic_salary || 0,
      form.allowances as Record<string, number>,
      overtimeAmount
    );

    // Country-specific rounding
    const decimal = defaults.decimal_places || 2;
    const rounding = defaults.rounding_method || "round";
    function smartRound(value: number, decimal: number, method: string) {
      if (method === "floor") return Math.floor(value);
      if (method === "ceil") return Math.ceil(value);
      return Number(value.toFixed(decimal));
    }

    // Deductions calculation
    const dedCopy: Record<string, number> = { ...(form.deductions as Record<string, number>) };
    if (form.country === "USA") {
      const ss = ((defaults.fico_ss_pct || 0) / 100) * gross;
      const med = ((defaults.fico_med_pct || 0) / 100) * gross;
      const fed = ((defaults.federal_tax_pct || 0) / 100) * gross;
      dedCopy.social_security = Number((dedCopy.social_security || 0) + ss);
      dedCopy.medicare = Number((dedCopy.medicare || 0) + med);
      dedCopy.federal_tax = Number((dedCopy.federal_tax || 0) + fed);
    } else if (form.country === "BF") {
      const cnss = ((defaults.cnss_pct || 0) / 100) * gross;
      const iuts = ((defaults.iuts_pct || 0) / 100) * gross;
      dedCopy.cnss = Number((dedCopy.cnss || 0) + cnss);
      dedCopy.iuts = Number((dedCopy.iuts || 0) + iuts);
    }

    if (form.country === "BF") {
      const cnss = ((defaults.cnss_pct || 0) / 100) * gross;
      const iuts = ((defaults.iuts_pct || 0) / 100) * gross;

      dedCopy.cnss = smartRound(Number((dedCopy.cnss || 0) + cnss), decimal, rounding);
      dedCopy.iuts = smartRound(Number((dedCopy.iuts || 0) + iuts), decimal, rounding);
    }

    // Net salary calculation
    const net = calcNet(gross, dedCopy);

    // Rounded values
    const grossRounded = smartRound(gross, decimal, rounding);
    const netRounded = smartRound(net, decimal, rounding);

    // Update database
    setLoading(true);
    const before = salaryStructures.find((s) => s.id === editId);
    try {
      const { data, error } = await supabase
        .from("salary_structures")
        .update({
          basic_salary: form.basic_salary,
          hours_worked: form.hours_worked,
          hourly_rate: form.hourly_rate,
          overtime_hours: form.overtime_hours,
          overtime_rate: form.overtime_rate,
          allowances: form.allowances,
          deductions: dedCopy,
          gross_salary: grossRounded,
          net_salary: netRounded,
          currency: form.currency,
          country: form.country,
          effective_date: form.effective_date,
          is_active: form.is_active,
        })
        .eq("id", editId)
        .select("*")
        .single();

      if (error) throw error;

      // Audit log
      tryInsertOptional("audit_logs", {
        entity: "salary_structure",
        entity_id: editId,
        action: "update",
        diff: { before, after: data },
        created_at: new Date().toISOString(),
      });

      toast({
        title: "Updated",
        description: "Salary structure updated successfully",
      });
      setIsModalOpen(false);
      setEditId(null);
      await fetchSalaryStructures();

    } catch (err: any) {
      console.error("update error", err);
      toast({
        title: "Error",
        description: "Failed to update salary structure",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // --------------------- Allowance/deduction helpers ---------------------
  const handleAllowanceChange = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      allowances: {
        ...(prev.allowances as Record<string, number>),
        [key]: Number(value || 0),
      },
    }));
  };

  const handleDeductionChange = (key: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      deductions: {
        ...(prev.deductions as Record<string, number>),
        [key]: Number(value || 0),
      },
    }));
  };

  // --------------------- Filtering ---------------------
  const filteredSalaries = salaryStructures.filter((s) => {
    const matchesSearch = s.employee_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && s.is_active) ||
      (filterStatus === "inactive" && !s.is_active);

    const matchesApprovalStatus =
      filterApprovalStatus === "all" ||
      s.approval_status === filterApprovalStatus;

    const matchesPaymentStatus =
      filterPaymentStatus === "all" || s.payment_status === filterPaymentStatus;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesApprovalStatus &&
      matchesPaymentStatus
    );
  });

  // --------------------- Live previews ---------------------
  const liveOvertimeAmount = computeOvertimeAmount(
    form.hourly_rate || 0,
    form.overtime_hours || 0,
    form.overtime_rate || COUNTRY_DEFAULTS[form.country].overtime_multiplier,
    COUNTRY_DEFAULTS[form.country]
  );
  const liveGross = calcGross(
    form.basic_salary || 0,
    form.allowances as Record<string, number>,
    liveOvertimeAmount
  );
  const liveNet = calcNet(liveGross, form.deductions as Record<string, number>);

  // --------------------- UI helpers (badges/stats) ---------------------
  const monthLabel = useMemo(() => {
    if (!filterMonth) return "Month";
    return filterMonth.charAt(0).toUpperCase() + filterMonth.slice(1);
  }, [filterMonth]);

  const getApprovalStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-yellow-600",
      },
      approved: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      rejected: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        color: "text-gray-600",
      },
      processing: {
        variant: "outline" as const,
        icon: AlertCircle,
        color: "text-blue-600",
      },
      paid: {
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600",
      },
      failed: {
        variant: "destructive" as const,
        icon: XCircle,
        color: "text-red-600",
      },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const stats = useMemo(() => {
    const total = salaryStructures.length;
    const pendingApproval = salaryStructures.filter(
      (s) => s.approval_status === "pending"
    ).length;
    const approved = salaryStructures.filter(
      (s) => s.approval_status === "approved"
    ).length;
    const pendingPayment = salaryStructures.filter(
      (s) => s.payment_status === "pending"
    ).length;
    const paid = salaryStructures.filter(
      (s) => s.payment_status === "paid"
    ).length;

    const totalPayroll = salaryStructures
      .filter((s) => s.approval_status === "approved")
      .reduce((sum, s) => sum + Number(s.net_salary || 0), 0);

    const avgGross =
      total > 0
        ? salaryStructures.reduce(
          (sum, s) => sum + Number(s.gross_salary || 0),
          0
        ) / total
        : 0;

    return {
      total,
      pendingApproval,
      approved,
      pendingPayment,
      paid,
      totalPayroll,
      avgGross,
    };
  }, [salaryStructures]);

  // --------------------------- Render ---------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Salary Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage employee salary structures with approval workflow
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Bulk approval buttons */}
              <Button
                onClick={() => handleBulkApproval("approved")}
                className="bg-green-600 hover:bg-green-700"
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve
              </Button>
              <Button
                onClick={() => handleBulkApproval("rejected")}
                variant="outline"
                className="border-red-200 hover:bg-red-50"
                disabled={loading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Bulk Reject
              </Button>
              <Button
                onClick={openAddModal}
                className="bg-gradient-to-r from-green-600 to-green-700"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Salary
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Approval status filter */}
            <select
              value={filterApprovalStatus}
              onChange={(e) => setFilterApprovalStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Approvals</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Payment status filter */}
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending Payment</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>

            {/* Month selector */}
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Structures
                  </p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingApproval}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.approved}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text_green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Payment
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.pendingPayment}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Payroll
                  </p>
                  <p className="text-xl font-bold text-purple-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    }).format(stats.totalPayroll)}
                  </p>
                </div>
                <PiggyBank className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Gross</p>
                  <p className="text-xl font-bold text-green-600">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                    }).format(stats.avgGross)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Salary Structures</span>
            </CardTitle>
            <CardDescription>
              Showing {filteredSalaries.length} of {salaryStructures.length}{" "}
              salary structures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Hours ({monthLabel})</TableHead>
                    <TableHead>Approval Status</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((s) => {
                    const monthlyHours = s.employee_id
                      ? attendanceHoursByEmployee[s.employee_id] || 0
                      : 0;

                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {s.employee_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <p className="font-semibold">{s.employee_name}</p>
                              <p className="text-sm text-gray-500">
                                {s.country} • {s.currency}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: s.currency || "USD",
                          }).format(Number(s.basic_salary || 0))}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: s.currency || "USD",
                          }).format(Number(s.gross_salary || 0))}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: s.currency || "USD",
                          }).format(Number(s.net_salary || 0))}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono">
                            {monthlyHours.toFixed(1)}h
                          </span>
                        </TableCell>

                        {/* Approval Status (click to change) */}
                        <TableCell>
                          <button
                            onClick={() =>
                              setStatusModal({
                                open: true,
                                type: "approval",
                                salaryId: s.id,
                                currentStatus: s.approval_status || "pending",
                                newStatus: s.approval_status || "pending",
                                notes: "",
                                reference: "",
                              })
                            }
                            className="hover:bg-gray-50 p-1 rounded"
                          >
                            {getApprovalStatusBadge(
                              s.approval_status || "pending"
                            )}
                          </button>
                        </TableCell>

                        {/* Payment Status (click to change if approved) */}
                        <TableCell>
                          <button
                            onClick={() => {
                              if (s.approval_status !== "approved") {
                                toast({
                                  title: "Approval Required",
                                  description:
                                    "Salary must be approved before payment processing",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setStatusModal({
                                open: true,
                                type: "payment",
                                salaryId: s.id,
                                currentStatus: s.payment_status || "pending",
                                newStatus: s.payment_status || "pending",
                                notes: "",
                                reference: "",
                              });
                            }}
                            className="hover:bg-gray-50 p-1 rounded"
                            disabled={s.approval_status !== "approved"}
                          >
                            {getPaymentStatusBadge(
                              s.payment_status || "pending"
                            )}
                          </button>
                        </TableCell>

                        <TableCell>
                          {s.effective_date
                            ? formatDate(
                              parseISO(s.effective_date),
                              "MMM dd, yyyy"
                            )
                            : "-"}
                        </TableCell>

                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setViewModal({ open: true, salary: s })
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <AlertDialog
                              open={viewModal.open}
                              onOpenChange={() =>
                                setViewModal({ open: false, salary: null })
                              }
                            >

                              <AlertDialogContent className="max-w-2xl">
                                <button onClick={() => setViewModal({ open: false, salary: null })} className="absolute top-4 right-4 text-3xl">X</button>
                                <h2 className="text-xl font-semibold mb-4">
                                  Salary Details
                                </h2>
                                {viewModal.salary && (
                                  <div className="space-y-2 text-sm">
                                    <p>
                                      <strong>Employee:</strong>{" "}
                                      {viewModal.salary.employee_name}
                                    </p>
                                    <p>
                                      <strong>Country:</strong>{" "}
                                      {viewModal.salary.country}
                                    </p>
                                    <p>
                                      <strong>Basic Salary:</strong>{" "}
                                      {viewModal.salary.basic_salary}
                                    </p>
                                    <p>
                                      <strong>Gross Salary:</strong>{" "}
                                      {viewModal.salary.gross_salary}
                                    </p>
                                    <p>
                                      <strong>Net Salary:</strong>{" "}
                                      {viewModal.salary.net_salary}
                                    </p>
                                    <p>
                                      <strong>Approval Status:</strong>{" "}
                                      {viewModal.salary.approval_status}
                                    </p>
                                    <p>
                                      <strong>Payment Status:</strong>{" "}
                                      {viewModal.salary.payment_status}
                                    </p>
                                    <p>
                                      <strong>Effective Date:</strong>{" "}
                                      {viewModal.salary.effective_date}
                                    </p>
                                  </div>
                                )}
                              </AlertDialogContent>
                            </AlertDialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(s.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(s.id)}
                              disabled={
                                s.approval_status === "approved" &&
                                s.payment_status === "paid"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredSalaries.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-gray-500"
                      >
                        No salary structures found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Salary Modal */}
      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>

        <AlertDialogContent className="max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editId ? "Edit Salary" : "Create Salary Structure"}
            </h2>
            <div className="text-sm text-gray-500">
              Preview Gross:{" "}
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: form.currency,
                  minimumFractionDigits: decimalPlaces,
                  maximumFractionDigits: decimalPlaces,
                }).format(liveGross)}
              </strong>{" "}
              — Net:{" "}
              <strong>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: form.currency,
                  minimumFractionDigits: decimalPlaces,
                  maximumFractionDigits: decimalPlaces,
                }).format(liveNet)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left column: select employees + basic */}
            <div>
              <Label>Assign Employees</Label>
              <ScrollArea className="h-48 border rounded p-3 mb-2">
                <div className="flex flex-col gap-2">
                  {employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedEmployeeIds.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          if (checked)
                            setSelectedEmployeeIds((prev) => [...prev, emp.id]);
                          else
                            setSelectedEmployeeIds((prev) =>
                              prev.filter((id) => id !== emp.id)
                            );
                        }}
                        disabled={editId !== null} // Disable when editing
                      />
                      <span>
                        {emp.first_name} {emp.last_name}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Country</Label>
                  <select
                    value={form.country}
                    onChange={(e) => {
                      resetFormForCountry(e.target.value);
                      setForm((prev) => ({ ...prev, country: e.target.value }));
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="USA">USA</option>
                    <option value="BF">Burkina Faso</option>
                  </select>
                </div>

                <div>
                  <Label>Currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, currency: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label>Basic Salary</Label>
                  <Input
                    type="number"
                    value={form.basic_salary}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        basic_salary: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Hours Worked (period)</Label>
                  <Input
                    type="number"
                    value={form.hours_worked}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hours_worked: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Hourly Rate</Label>
                  <Input
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hourly_rate: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Overtime Hours</Label>
                  <Input
                    type="number"
                    value={form.overtime_hours}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        overtime_hours: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Overtime Rate (multiplier or per-hour)</Label>
                  <Input
                    type="number"
                    value={form.overtime_rate}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        overtime_rate: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={form.effective_date}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        effective_date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label>Frequency</Label>
                  <select
                    value={form.frequency}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        frequency: e.target.value as any,
                      }))
                    }
                    className="w-full p-2 border rounded"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <Label>Delay Buffer (business days)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={form.buffer_business_days}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        buffer_business_days: Math.max(
                          0,
                          Math.min(5, Number(e.target.value))
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-4 p-4 border rounded bg-gray-50">
                <h4 className="font-semibold mb-2">Salary Preview in Other Currencies</h4>
                {["USD", "CFA", "EUR"].map((cur) => {
                  const grossInCur = convertCurrency(liveGross, form.currency, cur);
                  const decimals = cur === "CFA" ? 0 : 2;

                  const formatNumber = (num: number) =>
                    new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: cur,
                      minimumFractionDigits: decimals,
                      maximumFractionDigits: decimals,
                    }).format(num);
                  return (
                    <div key={cur} className="text-sm mb-1">
                      <strong>{cur}:</strong>{" "}
                      Hourly: {formatNumber(getSalaryByFrequency(grossInCur, "hourly", form.hours_worked))},{" "}
                      Monthly: {formatNumber(getSalaryByFrequency(grossInCur, "monthly"))},{" "}
                      Yearly: {formatNumber(getSalaryByFrequency(grossInCur, "yearly"))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right column: allowances/deductions */}
            <div>
              <Label className="mb-2">Allowances (editable)</Label>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.keys(form.allowances).map((key) => (
                  <div key={key}>
                    <Label className="text-xs capitalize">
                      {key.replace("_", " ")}
                    </Label>
                    <Input
                      type="number"
                      value={(form.allowances as any)[key] ?? 0}
                      onChange={(e) =>
                        handleAllowanceChange(key, Number(e.target.value))
                      }
                    />
                  </div>
                ))}
              </div>

              <Label className="mb-2">Deductions (editable)</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(form.deductions).map((key) => (
                  <div key={key}>
                    <Label className="text-xs capitalize">
                      {key.replace("_", " ")}
                    </Label>
                    <Input
                      type="number"
                      value={(form.deductions as any)[key] ?? 0}
                      onChange={(e) =>
                        handleDeductionChange(key, Number(e.target.value))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Overtime Pay</span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: form.currency,
                    }).format(liveOvertimeAmount)}
                  </strong>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Gross Preview</span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: form.currency,
                    }).format(liveGross)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Net Preview</span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: form.currency,
                    }).format(liveNet)}
                  </strong>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={editId ? handleUpdate : handleSave}
                  className="bg-gradient-to-r from-green-600 to-green-700"
                  disabled={loading}
                >
                  {loading
                    ? editId
                      ? "Updating..."
                      : "Saving..."
                    : editId
                      ? "Update Salary"
                      : "Save Salary"}
                </AlertDialogAction>
              </div>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Status Modal === */}
      {statusModal.open && (
        <AlertDialog
          open={statusModal.open}
          onOpenChange={(open) => setStatusModal({ ...statusModal, open })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusModal.type === "approval"
                  ? "Update Approval Status"
                  : "Update Payment Status"}
              </AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-4">
              <Select
                value={statusModal.newStatus}
                onValueChange={(value) =>
                  setStatusModal({ ...statusModal, newStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusModal.type === "approval" ? (
                    <>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {statusModal.newStatus === "rejected" && (
                <Textarea
                  placeholder="Enter rejection reason"
                  value={statusModal.notes}
                  onChange={(e) =>
                    setStatusModal({ ...statusModal, notes: e.target.value })
                  }
                />
              )}

              {statusModal.type === "payment" && (
                <Input
                  placeholder="Payment Reference"
                  value={statusModal.reference}
                  onChange={(e) =>
                    setStatusModal({
                      ...statusModal,
                      reference: e.target.value,
                    })
                  }
                />
              )}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setStatusModal({ ...statusModal, open: false })}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  handleStatusChange(
                    statusModal.salaryId!,
                    statusModal.type,
                    statusModal.newStatus,
                    statusModal.notes,
                    statusModal.reference
                  )
                }
              >
                Update
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default SalaryManagement;

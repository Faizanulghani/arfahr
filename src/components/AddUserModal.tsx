import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Fingerprint } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { nanoid } from "nanoid";
import { t } from "i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const FINGER_API_URL = import.meta.env.VITE_FINGERPR_API_URL;

const AddUserModal = ({ onClose, onUserAdded, selectedUser }: any) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [capturedCount, setCapturedCount] = useState(0);
  const [fingerprintId, setFingerprintId] = useState("");
  const [allBiometricData, setAllBiometricData] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    salary: "",
    salary_type: "monthly",
    currency: "USD",
    joining_date: "",
    employment_type: "full_time",
    emergency_contact: "",
    emergency_phone: "",
    role: "employee",
    has_agreed_to_terms: false,
  });

  async function verifyDuplicateFinger(probePng: string, candidatePng: string) {
    const res = await fetch(`${FINGER_API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probePng, candidatePng }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Verify failed");
    return data; // { match, score, threshold }
  }

  // ✅ Fill form when editing user
  useEffect(() => {
    if (selectedUser && selectedUser.profile) {
      const p = selectedUser.profile;
      setFormData((prev) => ({
        ...prev,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: selectedUser.email || "",
        phone: p.phone || "",
        address: p.address || "",
        position: p.position || "",
        department: p.department || "",
        joining_date: p.hire_date ? p.hire_date.split("T")[0] : "",
        employment_type: p.employment_type || "full_time",
        emergency_contact: p.emergency_contact || "",
        emergency_phone: p.emergency_phone || "",
        salary: p.salary || "",
        salary_type: p.salary_type || "monthly",
        currency: p.currency || "USD",
        role: selectedUser.role || "employee",
      }));
    }
  }, [selectedUser]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== "fingerprint-register") return;

      if (capturedCount >= 10) {
        setBiometricLoading(false);
        return;
      }

      const newTemplate = event.data.image;

      try {
        // ✅ DUPLICATE CHECK (newTemplate vs already stored)
        for (let i = 0; i < allBiometricData.length; i++) {
          const existing = allBiometricData[i];
          if (!existing) continue;

          const result = await verifyDuplicateFinger(newTemplate, existing);
          if (result.match) {
            setBiometricLoading(false);

            toast({
              title: "❌ Finger Already Scanned",
              description: `This finger is already registered. Please scan a different finger.`,
              variant: "destructive",
            });

            return;
          }
        }

        // ✅ UNIQUE → SAVE
        if (!fingerprintId) setFingerprintId(nanoid());

        setAllBiometricData((prev) => [...prev, newTemplate]);
        setCapturedCount((prev) => prev + 1);
        setBiometricLoading(false);

        toast({
          title: `Finger ${capturedCount + 1} Captured ✅`,
          description:
            capturedCount < 9 ? "Scan next finger." : "All fingers ready!",
        });
      } catch (err) {
        console.error(err);
        setBiometricLoading(false);

        toast({
          title: "❌ Finger Verification Failed",
          description: "Fingerprint API not reachable. Try again.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [capturedCount, allBiometricData, fingerprintId]);

  const handleBiometricCapture = () => {
    if (selectedUser || capturedCount >= 10) return;
    setBiometricLoading(true);
    iframeRef.current?.contentWindow?.postMessage(
      { action: "start-scan" },
      window.location.origin
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      address,
      position,
      department,
      salary,
      joining_date,
      employment_type,
      emergency_contact,
      emergency_phone,
      role,
      has_agreed_to_terms,
    } = formData;

    // ✅ UPDATE EXISTING USER
    if (selectedUser) {
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          first_name: formData.first_name,
          last_name,
          email,
          phone,
          address,
          position,
          department,
          salary: salary ? Number(salary) : null,
          salary_type: formData.salary_type,
          currency: formData.currency,
          joining_date,
          employment_type,
          emergency_contact,
          emergency_phone,
          biometric_data: allBiometricData.length ? allBiometricData : null,
          raw_template: allBiometricData[0] || null,
          raw_samples: allBiometricData.length ? allBiometricData : null,
          role,
        })
        .eq("id", selectedUser.id);

      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(selectedUser.id, {
          email,
          user_metadata: {
            ...selectedUser.user_metadata,
            name: `${formData.first_name} ${formData.last_name}`,
            first_name: formData.first_name,
            last_name: formData.last_name,
            role,
            department,
            phone,
            address,
            position,
            salary,
            salary_type: formData.salary_type,
            currency: formData.currency,
            emergency_phone,
            status: selectedUser.status || "active",
          },
        });

      if (authError) throw authError;

      if (updateError) {
        toast({
          title: t("usersManagement:toast.updateFailed"),
          description: updateError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: t("usersManagement:toast.userUpdated"),
        description: t("usersManagement:usersManagement.userUpdatedDesc"),
      });
      onUserAdded(); // Refresh list
      onClose();
      setLoading(false);
      return;
    }

    // ✅ ADD NEW USER
    if (!password) {
      toast({
        title: t("usersManagement:toast.missingPassword"),
        description: t("usersManagement:toast.missingPasswordDesc"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const adminSession = await supabase.auth.getSession();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: `${first_name} ${last_name}`,
          first_name: first_name, // Explicitly add these
          last_name: last_name,
          role,
          department,
          phone,
          address,
          position,
          salary,
          salary_type: formData.salary_type,
          currency: formData.currency,
          joining_date,
          status: "active",
        },
      });

    await supabase.auth.setSession(adminSession.data.session);

    if (authError || !authData.user) {
      toast({
        title: t("usersManagement:toast.addUserFailed"),
        description: authError?.message || "Something went wrong",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    const { error: empInsertError } = await supabase.from("employees").insert([
      {
        id: userId,
        first_name,
        last_name,
        email,
        phone,
        address,
        position,
        department,
        salary: salary ? Number(salary) : null,
        salary_type: formData.salary_type,
        currency: formData.currency,
        joining_date,
        employment_type,
        emergency_contact,
        emergency_phone,
        biometric_data: allBiometricData.length ? allBiometricData : null,
        raw_template: allBiometricData[0] || null,
        raw_samples: allBiometricData.length ? allBiometricData : null,
        has_agreed_to_terms,
        role,
        status: "active",
      },
    ]);

    if (empInsertError) {
      toast({
        title: t("usersManagement:toast.addUserError"),
        description: empInsertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: t("usersManagement:toast.userAdded"),
      description: t("usersManagement:toast.userAddedDesc"),
    });
    onUserAdded();
    onClose();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {selectedUser ? "Edit User" : "Add New User"}
          </CardTitle>
          <CardDescription>
            {selectedUser
              ? t("usersManagement:form.updateEmployeeTitle")
              : t("usersManagement:form.addEmployeeTitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.firstName")}</Label>
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.lastName")}</Label>
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {!selectedUser && (
              <div className="space-y-2 col-span-1">
                <Label>{t("usersManagement:auth.password")}</Label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.phone")}</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("usersManagement:form.address")}</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.position")}</Label>
              <Input
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.department")}</Label>
              <Input
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>

            {/* Salary Setup */}
            <div className="col-span-2 rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base font-semibold">
                    Salary Setup
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose type, currency and amount
                  </p>
                </div>

                <div className="text-xs font-semibold px-3 py-1 rounded-full border bg-slate-50">
                  {formData.currency} • {formData.salary_type?.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Salary Type */}
                <div className="space-y-2">
                  <Label>Salary Type</Label>
                  <Select
                    value={formData.salary_type}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, salary_type: val }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, currency: val }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="CFA">CFA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Salary Amount */}
                <div className="space-y-2">
                  <Label>{t("usersManagement:form.salary")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      {formData.currency === "USD" ? "$" : "CFA"}
                    </span>
                    <Input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleChange}
                      min={0}
                      step="0.01"
                      className="h-11 rounded-lg pl-12"
                      placeholder={
                        formData.salary_type === "hourly"
                          ? "e.g. 8"
                          : "e.g. 1200"
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formData.salary_type === "hourly"
                      ? "Hourly rate (per hour)"
                      : "Monthly salary (per month)"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.joiningDate")}</Label>
              <Input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.employmentType")}</Label>
              <Input
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.emergencyContact")}</Label>
              <Input
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.emergencyPhone")}</Label>
              <Input
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>{t("usersManagement:form.chooseRole")}</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, role: val }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin">
                    {t("usersManagement:form.admin")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manager" id="manager" />
                  <Label htmlFor="manager">
                    {t("usersManagement:form.manager")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employee" id="employee" />
                  <Label htmlFor="employee">
                    {t("usersManagement:form.employee")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {!selectedUser && (
              <div className="flex items-center gap-2 col-span-2">
                <input
                  type="checkbox"
                  name="has_agreed_to_terms"
                  checked={formData.has_agreed_to_terms}
                  onChange={handleChange}
                  required
                />
                <Label>{t("usersManagement:form.confirmPolicy")}</Label>
              </div>
            )}

            {!selectedUser && (
              <div className="col-span-2 space-y-6 p-6 bg-white rounded-xl border border-blue-100 shadow-sm">
                <div className="flex justify-between items-center">
                  <Label className="text-blue-600 font-bold flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Fingerprint Registration
                  </Label>
                  <span className="text-sm font-mono font-bold text-blue-500">
                    {capturedCount}/10 Done
                  </span>
                </div>

                {/* Progress bar and nodes */}
                <div className="relative flex items-center justify-between px-2 h-20">
                  <div className="absolute top-[28px] left-0 w-full h-[2px] bg-slate-100 z-0" />
                  <div
                    className="absolute top-[28px] left-0 h-[2px] bg-green-500 z-0 transition-all duration-700 ease-in-out"
                    style={{
                      width: `${(Math.max(0, capturedCount - 1) / 9) * 100}%`,
                    }}
                  />

                  {[...Array(10)].map((_, index) => {
                    const isCaptured = index < capturedCount;
                    const isCurrent = index === capturedCount;
                    const isScanning = isCurrent && biometricLoading;

                    return (
                      <div
                        key={index}
                        className="relative z-10 flex flex-col items-center"
                      >
                        <div
                          className={`
                w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-white
                ${
                  isCaptured
                    ? "border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                    : isScanning
                    ? "border-blue-500 animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    : "border-slate-200 text-slate-300"
                }
              `}
                        >
                          <Fingerprint
                            className={`h-5 w-5 transition-colors duration-500 ${
                              isCaptured
                                ? "text-green-500"
                                : isScanning
                                ? "text-blue-500"
                                : "inherit"
                            }`}
                          />
                          {isScanning && (
                            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping" />
                          )}
                        </div>

                        <span
                          className={`text-[9px] mt-2 font-black transition-colors ${
                            isCaptured ? "text-green-600" : "text-slate-400"
                          }`}
                        >
                          F-{index + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Capture Button */}
                <Button
                  type="button"
                  onClick={handleBiometricCapture}
                  disabled={biometricLoading || capturedCount >= 10}
                  className={`w-full h-12 rounded-xl transition-all duration-500 group overflow-hidden relative shadow-md ${
                    capturedCount >= 10
                      ? "bg-slate-400 cursor-not-allowed opacity-80"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {capturedCount >= 10 ? (
                      <>
                        <Fingerprint className="h-5 w-5" />
                        <span className="font-bold tracking-tight">
                          All Fingers Captured
                        </span>
                      </>
                    ) : biometricLoading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Scanning Finger {capturedCount + 1}...</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        <span className="font-bold tracking-tight">
                          Scan Finger {capturedCount + 1}
                        </span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            )}

            <div className="col-span-2 pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading || (!selectedUser && allBiometricData.length === 0)
                }
              >
                {loading
                  ? t("usersManagement:form.processing")
                  : selectedUser
                  ? t("usersManagement:form.updateUser")
                  : t("usersManagement:users.addUser")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {!selectedUser && (
        <iframe
          ref={iframeRef}
          src="/fingerprint/index.html?mode=register"
          style={{ display: "none" }}
          title="Fingerprint Scanner"
        />
      )}
    </div>
  );
};

export default AddUserModal;

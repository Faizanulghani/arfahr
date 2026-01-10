import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Signup = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { t } = useTranslation("employee");

  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

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

  const [capturedCount, setCapturedCount] = useState(0);
  const [fingerprintIds, setFingerprintIds] = useState<string[]>([]);
  const [allBiometricData, setAllBiometricData] = useState<string[]>([]);

  const bufToHex = (buffer: ArrayBuffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "fingerprint-register") {
        if (capturedCount >= 10) {
          setBiometricLoading(false);
          return;
        }

        const newTemplate = event.data.image;
        const newId = nanoid();

        setFingerprintIds((prev) => [...prev, newId]);
        setAllBiometricData((prev) => [...prev, newTemplate]);
        setCapturedCount((prev) => prev + 1);

        setBiometricLoading(false);

        toast({
          title: `Finger ${capturedCount + 1} Captured ✅`,
          description:
            capturedCount < 9 ? "Scan next finger." : "All fingers ready!",
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [capturedCount]);

  const handleBiometricCapture = () => {
    if (capturedCount >= 10) return;

    setBiometricLoading(true);
    iframeRef.current?.contentWindow?.postMessage(
      { action: "start-scan" },
      "*"
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

    if (allBiometricData.length < 5) {
      toast({
        title: t("register:fingersIncomplete.title"),
        description: t("register:fingersIncomplete.description", {
          count: allBiometricData.length,
        }),
        variant: "destructive",
      });
      return;
    }

    if (allBiometricData.length === 0) {
      toast({
        title: t("register:fingerprintRequired.title"),
        description: t("register:fingerprintRequired.description"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // 1. Auth Signup (Email aur Password yahan use honge)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: `${formData.first_name} ${formData.last_name}`,
          role: formData.role,
          phone: formData.phone,
          address: formData.address,
          position: formData.position,
          department: formData.department,
          salary: formData.salary,
          salary_type: formData.salary_type,
          currency: formData.currency,
          employment_type: formData.employment_type,
          emergency_contact: formData.emergency_contact,
          emergency_phone: formData.emergency_phone,
        },
      },
    });

    if (authError || !authData.user) {
      toast({
        title: "Signup Failed",
        description: authError?.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const employeeData = {
      id: authData.user.id,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      position: formData.position,
      department: formData.department,
      salary: parseFloat(formData.salary),
      salary_type: formData.salary_type,
      currency: formData.currency,
      employment_type: formData.employment_type,
      address: formData.address || null,
      joining_date: formData.joining_date,
      status: "active",
      emergency_contact: formData.emergency_contact || null,
      emergency_phone: formData.emergency_phone || null,
      biometric_data: allBiometricData,
      has_agreed_to_terms: formData.has_agreed_to_terms,
      role: formData.role,
      raw_template: allBiometricData[0],
      raw_samples: allBiometricData,
    };

    // 3. Insert into Employees Table
    const { error: empInsertError } = await supabase
      .from("employees")
      .insert([employeeData]);

    if (empInsertError) {
      toast({
        title: "Database Error",
        description: empInsertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: t("register:accountCreated.title"),
      description: t("register:accountCreated.description"),
    });

    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("register:cardTitle")}</CardTitle>
          <CardDescription>{t("register:cardDescription")}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.firstName")}</Label>
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.lastName")}</Label>
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2 col-span-2">
              <Label>{t("register:labels.email")}</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.password")}</Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.phone")}</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            {/* Address */}
            <div className="space-y-2 col-span-2">
              <Label>{t("register:labels.address")}</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* Position */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.position")}</Label>
              <Input
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
              />
            </div>

            {/* Department */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.department")}</Label>
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

                {/* Small preview chip */}
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
                  <Label>{t("register:labels.salary")}</Label>
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
                      required
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

            {/* Joining Date */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.joiningDate")}</Label>
              <Input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                required
              />
            </div>

            {/* Employment Type */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.employmentType")}</Label>
              <Input
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
              />
            </div>

            {/* Emergency Contact */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.emergencyContact")}</Label>
              <Input
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
              />
            </div>

            {/* Emergency Phone */}
            <div className="space-y-2 col-span-1">
              <Label>{t("register:labels.emergencyPhone")}</Label>
              <Input
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2 col-span-2">
              <Label>{t("register:labels.role")}</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, role: val }))
                }
                className="flex gap-4"
              >
                {["admin", "manager", "employee"].map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <RadioGroupItem value={role} id={role} />
                    <Label htmlFor={role}>{t(`register:roles.${role}`)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Terms */}
            <div className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                name="has_agreed_to_terms"
                checked={formData.has_agreed_to_terms}
                onChange={handleChange}
                required
              />
              <Label>{t("register:labels.terms")}</Label>
            </div>

            {/* Biometric Section */}
            <div className="col-span-2 space-y-6 p-6 bg-white rounded-xl border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center">
                <Label className="text-blue-600 font-bold flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  {t("register:labels.biometric")}
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
                        {t("register:biometric.limitReached")}
                      </span>
                    </>
                  ) : biometricLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>
                        {t("register:biometric.scanningFinger", {
                          count: capturedCount + 1,
                        })}
                      </span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                      <span className="font-bold tracking-tight">
                        {t("register:biometric.captureFinger", {
                          count: capturedCount + 1,
                        })}
                      </span>
                    </>
                  )}
                </div>
              </Button>
            </div>

            {/* Submit Button */}
            <div className="col-span-2 pt-4">
              <Button
                type="submit"
                disabled={loading || allBiometricData.length === 0}
                className={`w-full h-12 text-base font-bold transition-all duration-300 shadow-sm ${
                  allBiometricData.length > 0
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200 hover:shadow-lg active:scale-[0.98]"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t("register:submit.creating")}</span>
                  </div>
                ) : allBiometricData.length === 0 ? (
                  t("register:submit.scanFirst")
                ) : (
                  <div className="flex items-center gap-2">
                    <span>
                      {t("register:submit.signUpFingers", {
                        count: allBiometricData.length,
                      })}
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Hidden iframe for biometric scanner */}
      <iframe
        ref={iframeRef}
        src="/fingerprint/index.html?mode=register"
        style={{ display: "none" }}
        title="Fingerprint Scanner"
      />
    </div>
  );
};

export default Signup;

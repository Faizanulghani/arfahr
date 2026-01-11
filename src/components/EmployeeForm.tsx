import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Fingerprint } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { t } from "i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FINGER_API_URL = import.meta.env.VITE_FINGERPR_API_URL;

const EmployeeForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [allBiometricData, setAllBiometricData] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    position: "",
    department: "",
    salary: "",
    salary_type: "monthly",
    currency: "USD",
    joining_date: "",
    employment_type: "full-time",
    password: "",
    role: "employee",
    emergency_contact: "",
    emergency_phone: "",
    has_agreed_to_terms: false,
  });

  const verifyDuplicateFinger = async (
    probePng: string,
    candidatePng: string
  ) => {
    const res = await fetch(`${FINGER_API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        probePng,
        candidatePng,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Verify failed");
    return data; // { match, score, threshold }
  };

  // ✅ Biometric Listener
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      if (e.data?.type !== "fingerprint-register") return;

      if (capturedCount >= 10) {
        setBiometricLoading(false);
        return;
      }

      const newTemplate = e.data.image;

      try {
        // 🔴 DUPLICATE CHECK
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

            return; // ❌ STOP HERE
          }
        }

        // ✅ NOT DUPLICATE → SAVE
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
          description: "Fingerprint service not reachable. Try again.",
          variant: "destructive",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [capturedCount, allBiometricData, toast]);

  const handleBiometricCapture = () => {
    if (capturedCount >= 10) return;

    setBiometricLoading(true);
    iframeRef.current?.contentWindow?.postMessage(
      { action: "start-scan" },
      "*"
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (allBiometricData.length < 1) {
      toast({
        title: t("employeeRegistration:toast.error"),
        description: t("employeeRegistration:toast.scanAtLeastOne"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            first_name: formData.first_name,
            last_name: formData.last_name,
            position: formData.position,
            department: formData.department,
            salary: formData.salary ? parseFloat(formData.salary) : null,
            salary_type: formData.salary_type,
            currency: formData.currency,
            employment_type: formData.employment_type,
            address: formData.address,
            joining_date: formData.joining_date,
            phone: formData.phone,
            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
            role: "employee",
          },
        });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: empError } = await supabase.from("employees").insert([
          {
            id: authData.user.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            position: formData.position,
            department: formData.department,
            salary: formData.salary ? parseFloat(formData.salary) : null,
            salary_type: formData.salary_type,
            currency: formData.currency,
            employment_type: formData.employment_type,
            address: formData.address,
            joining_date: formData.joining_date,
            role: "employee",
            biometric_data: allBiometricData,

            // optional (Signup jaisa)
            raw_template: allBiometricData[0],
            raw_samples: allBiometricData,

            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
            has_agreed_to_terms: formData.has_agreed_to_terms,
            status: "active",
          },
        ]);

        if (empError) throw empError;

        toast({
          title: t("employeeRegistration:toast.successTitle"),
          description: t("employeeRegistration:toast.employeeRegistered"),
        });

        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: t("employeeRegistration:toast.registrationFailed"),
        description:
          err.message || t("employeeRegistration:toast.somethingWentWrong"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-6 w-6 text-blue-600" />
          <span>{t("employeeRegistration:employeeRegistration.title")}</span>
        </CardTitle>
        <CardDescription>
          {t("employeeRegistration:employeeRegistration.description")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="first_name"
              label={t("employeeRegistration:form.firstName")}
              value={formData.first_name}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="last_name"
              label={t("employeeRegistration:form.lastName")}
              value={formData.last_name}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="email"
              label={t("employeeRegistration:form.email")}
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="phone"
              label={t("employeeRegistration:form.phone")}
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="password"
              label={t("employeeRegistration:form.password")}
              type="password"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="position"
              label={t("employeeRegistration:form.position")}
              value={formData.position}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="department"
              label={t("employeeRegistration:form.department")}
              value={formData.department}
              onChange={handleInputChange}
            />
            {/* Salary Setup */}
            <div className="md:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
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
                  {formData.currency} •{" "}
                  {String(formData.salary_type).toUpperCase()}
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
                  <Label>{t("employeeRegistration:form.salary")}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      {formData.currency === "USD" ? "$" : "CFA"}
                    </span>
                    <Input
                      type="number"
                      name="salary"
                      value={formData.salary}
                      onChange={handleInputChange}
                      min={0}
                      step="0.01"
                      className="h-11 rounded-lg pl-12"
                      placeholder={
                        formData.salary_type === "hourly"
                          ? "e.g. 8"
                          : "e.g. 1200"
                      }
                      required
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {formData.salary_type === "hourly"
                      ? "Per hour"
                      : "Per month"}
                  </p>
                </div>
              </div>
            </div>

            <InputWithLabel
              name="joining_date"
              label={t("employeeRegistration:form.joiningDate")}
              type="date"
              value={formData.joining_date}
              onChange={handleInputChange}
            />
          </div>

          {/* ✅ Biometric Section */}
          <div className="col-span-2 space-y-6 p-6 bg-white rounded-xl border border-blue-100 shadow-sm">
            <div className="flex justify-between items-center">
              <Label className="text-blue-600 font-bold flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                {t("employeeRegistration:biometric.title")}
              </Label>
              <span className="text-sm font-mono font-bold text-blue-500">
                {capturedCount}/10 Done
              </span>
            </div>

            {/* Progress bar + nodes */}
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
                      {t("employeeRegistration:biometric.ready")}
                    </span>
                  </>
                ) : biometricLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>
                      {t("employeeRegistration:biometric.waiting")} (F-
                      {capturedCount + 1})
                    </span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    <span className="font-bold tracking-tight">
                      {t("employeeRegistration:biometric.scanFinger", {
                        number: capturedCount + 1,
                      })}
                    </span>
                  </>
                )}
              </div>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={formData.has_agreed_to_terms}
              onCheckedChange={(val) =>
                setFormData({ ...formData, has_agreed_to_terms: !!val })
              }
            />
            <Label htmlFor="terms">
              {t("employeeRegistration:terms.agree")}
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || capturedCount === 0}
          >
            {isLoading
              ? t("employeeRegistration:buttons.saving")
              : t("employeeRegistration:buttons.register")}
          </Button>
        </form>
      </CardContent>

      {/* Hidden iframe for scanner logic */}
      <iframe
        ref={iframeRef}
        src="/fingerprint/index.html?mode=register"
        style={{ display: "none" }}
        title="Fingerprint Scanner"
      />
    </Card>
  );
};

const InputWithLabel = ({
  name,
  label,
  type = "text",
  value,
  onChange,
}: any) => (
  <div className="space-y-1">
    <Label htmlFor={name} className="text-sm">
      {label}
    </Label>
    <Input
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      required
      className="focus:ring-blue-500"
    />
  </div>
);

export default EmployeeForm;

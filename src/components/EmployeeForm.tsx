import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    joining_date: "",
    employment_type: "full-time",
    password: "",
    role: "employee",
    emergency_contact: "",
    emergency_phone: "",
    has_agreed_to_terms: false,
  });

  // ✅ Biometric Listener (Same as Signup)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;

      if (e.data?.type === "fingerprint-register") {
        const newTemplate = e.data.image;

        setAllBiometricData((prev) => [...prev, newTemplate]);
        setCapturedCount((prev) => prev + 1);
        setBiometricLoading(false);

        toast({
          title: t("employeeRegistration:biometric.fingerCaptured", {
            number: capturedCount + 1,
          }),
          description:
            capturedCount < 9
              ? t("employeeRegistration:biometric.scanNext")
              : t("employeeRegistration:biometric.allReady"),
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [capturedCount]);

  const handleBiometricCapture = () => {
    setBiometricLoading(true);
    iframeRef.current?.contentWindow?.postMessage(
      { action: "start-scan" },
      "*"
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
            employment_type: formData.employment_type,
            address: formData.address,
            joining_date: formData.joining_date,
            phone: formData.phone,
            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
            role: "employee",
          },
        });

      if (authError) {
        throw authError;
      }

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
            employment_type: formData.employment_type,
            address: formData.address,
            joining_date: formData.joining_date,
            role: "employee",
            biometric_data: allBiometricData,
            emergency_contact: formData.emergency_contact,
            emergency_phone: formData.emergency_phone,
            has_agreed_to_terms: formData.has_agreed_to_terms,
            status: "active",
          },
        ]);

        if (empError) {
          throw empError;
        }

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
            <InputWithLabel
              name="salary"
              label={t("employeeRegistration:form.salary")}
              type="number"
              value={formData.salary}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="joining_date"
              label={t("employeeRegistration:form.joiningDate")}
              type="date"
              value={formData.joining_date}
              onChange={handleInputChange}
            />
          </div>

          {/* Biometric Section - EXACTLY LIKE SIGNUP */}
          <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-slate-700">
                {t("employeeRegistration:biometric.title")}
              </Label>
              <span
                className={`text-sm font-medium ${
                  capturedCount === 10 ? "text-green-600" : "text-blue-600"
                }`}
              >
                {t("employeeRegistration:biometric.captured", {
                  count: capturedCount + 1,
                })}
              </span>
            </div>

            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500"
                style={{ width: `${(capturedCount / 10) * 100}%` }}
              />
            </div>

            <Button
              type="button"
              onClick={handleBiometricCapture}
              disabled={biometricLoading || capturedCount >= 10}
              variant="outline"
              className="w-full flex gap-2 border-blue-200 hover:bg-blue-50"
            >
              <Fingerprint className="h-4 w-4" />
              {biometricLoading
                ? t("employeeRegistration:biometric.waiting")
                : capturedCount < 10
                ? t("employeeRegistration:biometric.scanFinger", {
                    number: capturedCount + 1,
                  })
                : t("employeeRegistration:biometric.ready")}
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

// Helper Components
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

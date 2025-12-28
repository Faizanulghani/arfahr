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
          title: `Finger ${capturedCount + 1} Captured ✅`,
          description:
            capturedCount < 9 ? "Scan next finger." : "All 10 fingers ready!",
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
        title: "Error",
        description: "Scan at least 1 finger.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Auth User Create karein (Admin Mode)
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
        console.error("Auth Error:", authError.message);
        throw authError;
      }

      if (authData?.user) {
        // Step 2: Employees Table mein entry karein
        const { error: empError } = await supabase.from("employees").insert([
          {
            id: authData.user.id, // Auth ID aur Table ID match honi chahiye
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
          // Agar yahan error aye to user ko batayein
          console.error("Database Insert Error:", empError.message);
          throw empError;
        }

        toast({
          title: "✅ Success",
          description: "Employee Registered Successfully in Database!",
        });

        navigate("/dashboard");
      }
    } catch (err: any) {
      toast({
        title: "❌ Registration Failed",
        description: err.message || "Something went wrong",
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
          <span>New Employee Registration</span>
        </CardTitle>
        <CardDescription>
          Enter details and register 10 fingerprints.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="first_name"
              label="First Name *"
              value={formData.first_name}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="last_name"
              label="Last Name *"
              value={formData.last_name}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="email"
              label="Email *"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="phone"
              label="Phone *"
              value={formData.phone}
              onChange={handleInputChange}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="first_name"
              label="First Name *"
              value={formData.first_name}
              onChange={handleInputChange}
            />
            {/* ... other fields */}
            <InputWithLabel
              name="password"
              label="Account Password *"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel
              name="position"
              label="Position *"
              value={formData.position}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="department"
              label="Department *"
              value={formData.department}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="salary"
              label="Salary"
              type="number"
              value={formData.salary}
              onChange={handleInputChange}
            />
            <InputWithLabel
              name="joining_date"
              label="Joining Date *"
              type="date"
              value={formData.joining_date}
              onChange={handleInputChange}
            />
          </div>

          {/* Biometric Section - EXACTLY LIKE SIGNUP */}
          <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-slate-700">
                Fingerprint Registration
              </Label>
              <span
                className={`text-sm font-medium ${
                  capturedCount === 10 ? "text-green-600" : "text-blue-600"
                }`}
              >
                {capturedCount} / 10 Captured
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
                ? "Waiting..."
                : capturedCount < 10
                ? `Scan Finger #${capturedCount + 1}`
                : "10 Fingers Ready ✅"}
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
            <Label htmlFor="terms">I agree to the terms and conditions *</Label>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={isLoading || capturedCount === 0}
          >
            {isLoading ? "Saving..." : "Register Employee"}
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

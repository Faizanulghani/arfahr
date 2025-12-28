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

const Signup = () => {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

    if (allBiometricData.length === 0) {
      toast({
        title: "Fingerprint Required",
        description: "Please scan your fingerprints before signing up.",
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
      salary: formData.salary ? parseFloat(formData.salary) : null,
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
      console.error("DB Error:", empInsertError);
      toast({
        title: "Database Error",
        description: empInsertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Account Created",
      description: "Employee profile created successfully.",
    });

    navigate("/login");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create Employee Account</CardTitle>
          <CardDescription>
            Fill the form to register a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-1">
              <Label>First Name</Label>
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Last Name</Label>
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
            <div className="space-y-2 col-span-1">
              <Label>Password</Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Phone</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Address</Label>
              <Input
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Position</Label>
              <Input
                name="position"
                value={formData.position}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Department</Label>
              <Input
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Salary</Label>
              <Input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Joining Date</Label>
              <Input
                type="date"
                name="joining_date"
                value={formData.joining_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Employment Type</Label>
              <Input
                name="employment_type"
                value={formData.employment_type}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Emergency Contact</Label>
              <Input
                name="emergency_contact"
                value={formData.emergency_contact}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2 col-span-1">
              <Label>Emergency Phone</Label>
              <Input
                name="emergency_phone"
                value={formData.emergency_phone}
                onChange={handleChange}
              />
            </div>

            {/* ✅ Role Selection */}
            <div className="space-y-2 col-span-2">
              <Label>Choose Role</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(val) =>
                  setFormData((prev) => ({ ...prev, role: val }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin">Admin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manager" id="manager" />
                  <Label htmlFor="manager">Manager</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="employee" id="employee" />
                  <Label htmlFor="employee">Employee</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <input
                type="checkbox"
                name="has_agreed_to_terms"
                checked={formData.has_agreed_to_terms}
                onChange={handleChange}
                required
              />
              <Label>I agree to the terms and conditions</Label>
            </div>
            <div className="col-span-2 space-y-3 p-4 bg-slate-50 rounded-lg border">
              <div className="flex justify-between text-sm font-medium">
                <span>Fingerprint Registration</span>
                <span
                  className={
                    capturedCount === 10 ? "text-green-600" : "text-blue-600"
                  }
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
                className="w-full flex gap-2"
              >
                <Fingerprint className="h-4 w-4" />
                {biometricLoading
                  ? "Waiting for Scanner..."
                  : capturedCount < 10
                  ? `Scan Finger #${capturedCount + 1}`
                  : "Registration Complete ✅"}
              </Button>
            </div>
            <div className="col-span-2 pt-4">
              <Button
                type="submit"
                className="w-full"
                // Fix 3: Button active logic
                disabled={loading || allBiometricData.length === 0}
              >
                {loading
                  ? "Creating Account..."
                  : allBiometricData.length === 0
                  ? "Scan Fingerprint to Continue"
                  : `Sign Up with ${allBiometricData.length} Fingers`}
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

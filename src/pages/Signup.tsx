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

  const [fingerprintId, setFingerprintId] = useState("");
  const [biometricData, setBiometricData] = useState("");

  const bufToHex = (buffer: ArrayBuffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      let templateData: ArrayBuffer | null = null;

      if (
        event.data?.type === "fingerprint-register" &&
        event.data.templateBase64
      ) {
        const b64 = event.data.templateBase64;
        const binaryString = atob(b64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        templateData = bytes.buffer;
      }

      if (event.data?.type === "fingerprint-register" && event.data.template) {
        if (event.data.template instanceof ArrayBuffer) {
          templateData = event.data.template;
        } else if (event.data.template.buffer) {
          templateData = event.data.template.buffer;
        }
      }

      if (
        !templateData &&
        event.data?.type === "fingerprint-register" &&
        event.data.image
      ) {
        console.warn(
          "Device returned image only — request template from SDK for uniqueness."
        );
        // TEMP fallback (testing only):
        const tempId = nanoid();
        setFingerprintId(tempId);
        setBiometricData(event.data.image);
        toast({
          title: "Fingerprint Captured",
          description: "Your fingerprint has been successfully scanned.",
        });
        setBiometricLoading(false);
        return;
      }

      if (templateData) {
        const hashBuffer = await crypto.subtle.digest("SHA-256", templateData);
        const hashHex = bufToHex(hashBuffer).substring(0, 64);
        setFingerprintId(hashHex);
        toast({
          title: "Fingerprint Captured",
          description: "Biometric template set.",
        });
        setBiometricLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleBiometricCapture = () => {
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

    if (!fingerprintId) {
      toast({
        title: "Fingerprint Required",
        description: "Please scan your fingerprint before signing up.",
        variant: "destructive",
      });
      return;
    }

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

    if (!role) {
      toast({
        title: "Missing Role",
        description: "Please select a role.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // ✅ 1. Create Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${first_name} ${last_name}`,
          role,
          department,
          phone,
          address,
          status: "active",
          position,
        },
      },
    });

    if (authError || !authData.user) {
      toast({
        title: "Signup Failed",
        description: authError?.message || "Something went wrong",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // ✅ 2. Check duplicate fingerprint
    if (fingerprintId) {
      const { data: existing, error: checkError } = await supabase
        .from("employees")
        .select("id")
        .eq("fingerprint_id", fingerprintId)
        .maybeSingle();

      if (checkError) {
        toast({
          title: "Error",
          description: "Failed to check fingerprint duplicates.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (existing) {
        toast({
          title: "Duplicate Fingerprint",
          description: "This fingerprint is already registered.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    // ✅ 3. Insert employee profile
    const { error: empInsertError } = await supabase.from("employees").insert([
      {
        id: userId, // same as Auth user
        first_name,
        last_name,
        email,
        phone,
        address: address || null,
        position,
        department,
        salary: salary ? Number(salary) : null,
        joining_date,
        employment_type,
        emergency_contact: emergency_contact || null,
        emergency_phone: emergency_phone || null,
        biometric_data: biometricData || null,
        fingerprint_id: fingerprintId || null,
        has_agreed_to_terms,
        role,
      },
    ]);

    if (empInsertError) {
      toast({
        title: "Signup Error",
        description: empInsertError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Account Created",
      description: "You can now login using your credentials",
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
            <div className="col-span-2">
              <Button
                type="button"
                onClick={handleBiometricCapture}
                disabled={biometricLoading || !!fingerprintId}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <Fingerprint className="h-4 w-4" />
                {biometricLoading
                  ? "Capturing Fingerprint..."
                  : biometricData
                  ? "Fingerprint Captured ✅"
                  : "Scan Fingerprint"}
              </Button>
            </div>
            <div className="col-span-2">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !fingerprintId}
              >
                {!fingerprintId
                  ? "Scan Fingerprint First"
                  : loading
                  ? "Creating Account..."
                  : "Sign Up"}
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

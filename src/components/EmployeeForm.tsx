import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import * as CryptoJS from "crypto-js";


interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  position: string;
  department: string;
  salary: string;
  joining_date: string;
  employment_type: string;
  emergency_contact: string;
  emergency_phone: string;
  has_agreed_to_terms: boolean;
  biometric_data?: string;
  fingerprint_id?: string;
}

const EmployeeForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>({
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
    emergency_contact: "",
    emergency_phone: "",
    has_agreed_to_terms: false,
    biometric_data: "",
    fingerprint_id: ""
  });

  // ✅ Listen for fingerprint scanner messages
  useEffect(() => {
  const handleFingerprint = (e: MessageEvent) => {
    if (e.data?.type === "fingerprint-register") {
      const pngBase64 = e.data.image;

      const hash = CryptoJS.SHA256(pngBase64).toString();

      setFormData(prev => ({
        ...prev,
        biometric_data: pngBase64,
        fingerprint_id: hash,
      }));

      toast({
        title: "✅ Fingerprint Captured",
        description: "Biometric fingerprint has been successfully recorded.",
      });

      setShowScanner(false);
    }
  };

  window.addEventListener("message", handleFingerprint);
  return () => window.removeEventListener("message", handleFingerprint);
}, []);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ["first_name", "last_name", "email", "phone", "position", "department", "joining_date"];
    for (let field of required) {
      if (!formData[field as keyof EmployeeFormData]) return false;
    }
    return formData.has_agreed_to_terms && formData.fingerprint_id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields, agree to terms, and scan fingerprint.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Check for duplicate fingerprint
      const { data: existing } = await supabase
        .from("employees")
        .select("id")
        .eq("fingerprint_id", formData.fingerprint_id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "⚠️ Duplicate Fingerprint",
          description: "This fingerprint is already registered.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.from("employees").insert(formData);

      if (error) throw error;

      toast({
        title: "✅ Employee Registered",
        description: `${formData.first_name} ${formData.last_name} has been saved successfully.`,
      });

      setFormData({
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
        emergency_contact: "",
        emergency_phone: "",
        has_agreed_to_terms: false,
        biometric_data: "",
        fingerprint_id: ""
      });

      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "❌ Error",
        description: "Something went wrong while saving employee.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-6 w-6" />
          <span>Employee Registration</span>
        </CardTitle>
        <CardDescription>Fill out the form and set biometric fingerprint</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel name="first_name" label="First Name *" value={formData.first_name} onChange={handleInputChange} />
            <InputWithLabel name="last_name" label="Last Name *" value={formData.last_name} onChange={handleInputChange} />
            <InputWithLabel name="email" label="Email *" type="email" value={formData.email} onChange={handleInputChange} />
            <InputWithLabel name="phone" label="Phone *" value={formData.phone} onChange={handleInputChange} />
          </div>

          {/* Address */}
          <TextareaWithLabel name="address" label="Address" value={formData.address} onChange={handleInputChange} />

          {/* Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel name="position" label="Position *" value={formData.position} onChange={handleInputChange} />
            <InputWithLabel name="department" label="Department *" value={formData.department} onChange={handleInputChange} />
            <InputWithLabel name="salary" label="Salary" type="number" value={formData.salary} onChange={handleInputChange} />
            <InputWithLabel name="joining_date" label="Joining Date *" type="date" value={formData.joining_date} onChange={handleInputChange} />
          </div>

          {/* Employment Type */}
          <div className="space-y-3">
            <Label>Employment Type</Label>
            <RadioGroup value={formData.employment_type} onValueChange={(val) => setFormData({ ...formData, employment_type: val })}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="full-time" id="ft" /><Label htmlFor="ft">Full Time</Label>
                <RadioGroupItem value="part-time" id="pt" /><Label htmlFor="pt">Part Time</Label>
                <RadioGroupItem value="contract" id="ct" /><Label htmlFor="ct">Contract</Label>
                <RadioGroupItem value="intern" id="int" /><Label htmlFor="int">Intern</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Emergency Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputWithLabel name="emergency_contact" label="Emergency Contact" value={formData.emergency_contact} onChange={handleInputChange} />
            <InputWithLabel name="emergency_phone" label="Emergency Phone" value={formData.emergency_phone} onChange={handleInputChange} />
          </div>

          {/* Biometric Setup */}
          <div className="space-y-2">
            <Button type="button" variant="outline" onClick={() => setShowScanner(true)}>
              Set Up Biometric
            </Button>
            {formData.fingerprint_id ? (
              <span className="text-green-600">✅ Biometric Set</span>
            ) : (
              <span className="text-gray-500">No biometric yet</span>
            )}

            {showScanner && (
              <div className="mt-4 border rounded overflow-hidden">
               <iframe
  src="/fingerprint/index.html?mode=register"
  title="Fingerprint Scanner"
  className="w-full h-[400px] border"
/>
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="terms"
              checked={formData.has_agreed_to_terms}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, has_agreed_to_terms: Boolean(checked) })
              }
            />
            <Label htmlFor="terms">I agree to the terms and conditions *</Label>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register Employee"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const InputWithLabel = ({ name, label, type = "text", value, onChange }: any) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} name={name} value={value} onChange={onChange} type={type} required />
  </div>
);

const TextareaWithLabel = ({ name, label, value, onChange }: any) => (
  <div className="space-y-2">
    <Label htmlFor={name}>{label}</Label>
    <Textarea id={name} name={name} value={value} onChange={onChange} />
  </div>
);

export default EmployeeForm;

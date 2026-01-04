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
import { cn } from "@/lib/utils";
import { t } from "i18next";

const AddUserModal = ({ onClose, onUserAdded, selectedUser }: any) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const [biometricCaptured, setBiometricCaptured] = useState(0);

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
        role: selectedUser.role || "employee",
      }));
    }
  }, [selectedUser]);

  const bufToHex = (buffer: ArrayBuffer) =>
    Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "fingerprint-register") {
        // Success logic: Increment progress
        setBiometricCaptured((prev) => Math.min(prev + 1, 10));

        // Agar pehli finger hai ya unique ID chahiye
        if (!fingerprintId) {
          setFingerprintId(nanoid());
        }

        toast({
          title: t("usersManagement:toast.fingerCaptured"),
          description: t("usersManagement:toast.fingerCapturedDesc", {
            count: biometricCaptured + 1,
          }),
        });

        setBiometricLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [biometricCaptured, fingerprintId]);

  const handleBiometricCapture = () => {
    if (selectedUser || biometricCaptured >= 10) return;
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
          joining_date,
          employment_type,
          emergency_contact,
          emergency_phone,
          biometric_data: biometricData || null,
          // fingerprint_id: fingerprintId || null,
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
        joining_date,
        employment_type,
        emergency_contact,
        emergency_phone,
        biometric_data: biometricData || null,
        // fingerprint_id: fingerprintId || null,
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

            <div className="space-y-2 col-span-1">
              <Label>{t("usersManagement:form.phone")}</Label>
              <Input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleChange}
              />
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
              <div className="col-span-2 space-y-3 p-4 bg-slate-50 rounded-lg border">
                <div className="flex justify-between text-sm font-medium">
                  <span>{t("usersManagement:biometric.registration")}</span>
                  <span
                    className={
                      biometricCaptured === 10
                        ? "text-green-600"
                        : "text-blue-600"
                    }
                  >
                    {biometricCaptured} / 10 Captured
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{ width: `${(biometricCaptured / 10) * 100}%` }}
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleBiometricCapture}
                  disabled={biometricLoading || biometricCaptured >= 10}
                  variant="outline"
                  className="w-full flex gap-2"
                >
                  <Fingerprint className="h-4 w-4" />
                  {biometricLoading
                    ? t("usersManagement:biometric.waitingScanner")
                    : biometricCaptured < 10
                    ? t("usersManagement:biometric.scanFinger", {
                        count: biometricCaptured + 1,
                      })
                    : t("usersManagement:biometric.completed")}
                </Button>
              </div>
            )}

            <div className="col-span-2 pt-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || (!selectedUser && !fingerprintId)}
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

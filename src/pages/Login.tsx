import { useState } from "react";
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
import { useAdmin } from "@/contexts/LaravelAdminContext";
import { t } from "i18next";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAdmin();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { email, password } = formData;

    // 1️⃣ Sign in user
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      toast({
        title: t("login:failed"),
        description: error?.message || t("login:invalid"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch role from employees table by email
    const { data: roleData, error: roleError } = await supabase
      .from("employees")
      .select("role")
      .eq("email", email)
      .single();

    if (roleError || !roleData) {
      toast({
        title: t("login:error"),
        description: t("login:descriptionErr"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    await login(email, password, roleData.role);

    // 3️⃣ Success & redirect
    toast({
      title: t("login:title"),
      description: t("login:description", { role: roleData.role }),
    });

    setTimeout(() => {
      if (roleData.role === "admin") navigate("/dashboard");
      else if (roleData.role === "manager") navigate("/manager-portal");
      else if (roleData.role === "employee") navigate("/employee-portal");
      else navigate("/login");
    }, 300);

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">{t("login:loginTitle")}</CardTitle>
          <CardDescription>{t("login:loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">{t("login:emailLabel")}</Label>
              <Input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("login:passwordLabel")}</Label>
              <Input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            <div className="text-center text-sm text-gray-600 mt-2">
              {t("login:noAccount")}
              <span
                onClick={() => navigate("/signup")}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                {t("login:signup")}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

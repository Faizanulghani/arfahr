import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import EmployeeForm from "@/components/EmployeeForm";
import i18n from "@/i18n/index";
import { useState } from "react";
import { t } from "i18next";

const EmployeeRegistration = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(i18n.language || "en");

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // this switches language at runtime
    setLang(lng);
    localStorage.setItem("lang", lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="flex space-x-3">
              <div className="flex items-center space-x-3">
                <select
                  value={lang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="border rounded px-2 py-1 bg-white"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                {t("employeeManagement:navbar.dashboard")}
              </Button>
              <Button onClick={() => navigate("/attendance")}>
                Attendance
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Employee Registration
          </h1>
          <p className="text-xl text-gray-600">
            {t("employeeRegistration:heading")}
          </p>
        </div>

        <EmployeeForm />
      </main>
    </div>
  );
};

export default EmployeeRegistration;

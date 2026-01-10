import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Shield,
  Users,
  Fingerprint,
  BarChart3,
} from "lucide-react";
import { t } from "i18next";
import { useState } from "react";
import i18n from "@/i18n/index";

const Index = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState(i18n.language || "en");

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // this switches language at runtime
    setLang(lng);
    localStorage.setItem("lang", lng);
  };

  const features = [
    {
      icon: Fingerprint,
      titleKey: "features.biometricAuthentication.title",
      descriptionKey: "features.biometricAuthentication.description",
    },
    {
      icon: Clock,
      titleKey: "features.realTimeTracking.title",
      descriptionKey: "features.realTimeTracking.description",
    },
    {
      icon: BarChart3,
      titleKey: "features.analyticsReports.title",
      descriptionKey: "features.analyticsReports.description",
    },
    {
      icon: Users,
      titleKey: "features.employeeManagement.title",
      descriptionKey: "features.employeeManagement.description",
    },
    {
      icon: Shield,
      titleKey: "features.roleBasedAccess.title",
      descriptionKey: "features.roleBasedAccess.description",
    },
    {
      icon: Calendar,
      titleKey: "features.shiftManagement.title",
      descriptionKey: "features.shiftManagement.description",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Fingerprint className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AfraExpress
                </h1>
                <p className="text-sm text-gray-600">
                  {t("navbar:smartAttendence")}
                </p>
              </div>
            </div>
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
              <Button
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                variant="outline"
                onClick={() => navigate("/login")}
              >
                {t("navbar:login")}
              </Button>
              {/* <Button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Dashboard
              </Button>

              <Button onClick={() => navigate("/scanner")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Fingerprint
              </Button>

              <Button onClick={() => navigate("/attendance-scanner")} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Attendance
              </Button> */}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-200">
            {t("heroSection:headline")}
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            {t("heroSection:heading")}
            <br />
            <span className="text-blue-600">{t("heroSection:heading2")}</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            {t("heroSection:para")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/attendance")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
            >
              {t("heroSection:button")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="text-lg px-8 py-3 border-2 hover:bg-gray-50"
            >
              {t("heroSection:button2")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">{t("stats:AccuracyRate")}</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 mb-2">
                &lt; 2s
              </div>
              <div className="text-gray-600">{t("stats:RecognitionTime")}</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                24/7
              </div>
              <div className="text-gray-600">{t("stats:SystemUptime")}</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                500+
              </div>
              <div className="text-gray-600">
                {t("stats:EmployeesSupported")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm"
            >
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">
                    {t(feature.titleKey, { ns: "features" })}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {t(feature.descriptionKey, { ns: "features" })}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
          <CardContent className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">
              {" "}
              {t("readyHeading", { ns: "cta" })}
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {t("readyDescription", { ns: "cta" })}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/employee-registration")}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
              >
                {t("registerButton", { ns: "cta" })}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/reports")}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3 "
              >
                {t("viewReportsButton", { ns: "cta" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Fingerprint className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">
                  {t("footer:companyName")}
                </span>
              </div>
              <p className="text-gray-400">{t("footer:companyDescription")}</p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {t("footer:quickLinks")}
              </h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:links.dashboard")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:links.attendance")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:links.reports")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:links.settings")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {t("footer:support")}
              </h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:supportLinks.documentation")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:supportLinks.helpCenter")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:supportLinks.contactUs")}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    {t("footer:supportLinks.systemStatus")}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t("contactInfo")}</h3>
              <p className="text-gray-400 mb-2">
                {t("footer:contactDetails.company")}
              </p>
              <p className="text-gray-400 mb-2">
                {t("footer:contactDetails.locations")}
              </p>
              <p className="text-gray-400">
                {t("footer:contactDetails.email")}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>{t("footer:copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

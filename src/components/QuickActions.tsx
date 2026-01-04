import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Clock,
  FileText,
  Calendar,
  Settings,
  BarChart3,
} from "lucide-react";
import { t } from "i18next";

const QuickActions = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: t("adminDashboard:quickActions.addEmployee.title"),
      description: t("adminDashboard:quickActions.addEmployee.description"),
      icon: UserPlus,
      color: "bg-blue-500 hover:bg-blue-600",
      action: () => navigate("/employee-registration"),
    },
    {
      title: t("adminDashboard:quickActions.markAttendance.title"),
      description: t("adminDashboard:quickActions.markAttendance.description"),
      icon: Clock,
      color: "bg-green-500 hover:bg-green-600",
      action: () => navigate("/attendance"),
    },
    {
      title: t("adminDashboard:quickActions.generateReport.title"),
      description: t("adminDashboard:quickActions.generateReport.description"),
      icon: FileText,
      color: "bg-purple-500 hover:bg-purple-600",
      action: () => navigate("/reports"),
    },
    {
      title: t("adminDashboard:quickActions.viewCalendar.title"),
      description: t("adminDashboard:quickActions.viewCalendar.description"),
      icon: Calendar,
      color: "bg-orange-500 hover:bg-orange-600",
      action: () => alert("Calendar feature coming soon!"),
    },
    {
      title: t("adminDashboard:quickActions.analytics.title"),
      description: t("adminDashboard:quickActions.analytics.description"),
      icon: BarChart3,
      color: "bg-indigo-500 hover:bg-indigo-600",
      action: () => alert("Analytics feature coming soon!"),
    },
    {
      title: t("adminDashboard:quickActions.settings.title"),
      description: t("adminDashboard:quickActions.settings.description"),
      icon: Settings,
      color: "bg-gray-500 hover:bg-gray-600",
      action: () => navigate("/settings"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              className={`h-20 flex flex-col items-center justify-center space-y-1 ${action.color} text-white`}
            >
              <action.icon className="h-6 w-6" />
              <div className="text-center">
                <div className="text-sm font-medium">{action.title}</div>
                <div className="text-xs opacity-90">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Info, CheckCircle } from "lucide-react";

const DashboardNotifications = () => {
  const notifications = [
    {
      id: 1,
      type: 'warning',
      title: 'Late Arrivals Alert',
      message: '3 employees are consistently arriving late this week',
      time: '2 hours ago',
      action: 'View Details'
    },
    {
      id: 2,
      type: 'info',
      title: 'System Update',
      message: 'Attendance system will be updated tonight at 2 AM',
      time: '4 hours ago',
      action: 'Learn More'
    },
    {
      id: 3,
      type: 'success',
      title: 'Monthly Report Ready',
      message: 'October attendance report has been generated',
      time: '1 day ago',
      action: 'Download'
    },
    {
      id: 4,
      type: 'warning',
      title: 'Missing Check-outs',
      message: '2 employees forgot to check out yesterday',
      time: '1 day ago',
      action: 'Review'
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info': return <Info className="h-4 w-4 text-blue-600" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'success': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </div>
          <Badge variant="secondary">{notifications.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <div key={notification.id} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <Badge className={`text-xs ${getBadgeColor(notification.type)}`}>
                      {notification.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{notification.time}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      {notification.action}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardNotifications;
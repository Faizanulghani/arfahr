import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Shield, Users, Fingerprint, BarChart3 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Fingerprint,
      title: "Biometric Authentication",
      description: "Secure fingerprint-based attendance with DigitalPersona integration"
    },
    {
      icon: Clock,
      title: "Real-time Tracking",
      description: "Live attendance monitoring and automatic punch in/out logging"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive attendance reports and data export capabilities"
    },
    {
      icon: Users,
      title: "Employee Management",
      description: "Complete employee database with shift scheduling and management"
    },
    {
      icon: Shield,
      title: "Role-based Access",
      description: "Multi-level access control for employees, managers, and admins"
    },
    {
      icon: Calendar,
      title: "Shift Management",
      description: "Flexible shift scheduling with overtime tracking and alerts"
    }
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
                <p className="text-sm text-gray-600">Smart Attendance System</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600" variant="outline" onClick={() => navigate("/login")}>
                Login
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
            Powered by DigitalPersona Technology
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            Biometric Attendance
            <br />
            <span className="text-blue-600">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Secure, reliable, and efficient fingerprint-based attendance system for AfraExpress International. 
            Track employee attendance, manage shifts, and generate comprehensive reports with our advanced biometric solution.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/attendance")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
            >
              Start Attendance
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="text-lg px-8 py-3 border-2 hover:bg-gray-50"
            >
              View Dashboard
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600 mb-2">&lt; 2s</div>
              <div className="text-gray-600">Recognition Time</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600">System Uptime</div>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-orange-600 mb-2">500+</div>
              <div className="text-gray-600">Employees Supported</div>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
          <CardContent className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 text-blue-100">
              Transform your attendance management with our biometric solution
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate("/employee-registration")}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
              >
                Register Employee
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/reports")}
                className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3 "
              >
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <Fingerprint className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold">AfraExpress</span>
              </div>
              <p className="text-gray-400">
                Advanced biometric attendance system for modern workplaces.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Dashboard</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Attendance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Reports</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Settings</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <p className="text-gray-400 mb-2">AfraExpress International</p>
              <p className="text-gray-400 mb-2">USA - Burkina Faso</p>
              <p className="text-gray-400">support@afraexpress.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AfraExpress International. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
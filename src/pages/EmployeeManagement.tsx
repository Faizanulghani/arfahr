import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Fingerprint,
  LogOut,
  Filter,
} from "lucide-react";
import useLogout from "@/api/useLogout";

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const logout = useLogout();

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, first_name, last_name, email, position, department, status, created_at"
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load employees", variant: "destructive" });
    } else {
      setEmployees(data);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Employee Deleted",
        description: `${name} has been removed.`,
      });
      fetchEmployees();
    }
  };

  const departments = [
    "all",
    ...Array.from(new Set(employees.map((emp) => emp.department))),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const filteredEmployees = employees.filter((employee) => {
    const name = `${employee.first_name} ${employee.last_name}`;
    const matchesSearch =
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      filterDepartment === "all" || employee.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Fingerprint className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Employee Management
                </h1>
                <p className="text-sm text-gray-600">Manage your workforce</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                Dashboard
              </Button>
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </option>
              ))}
            </select>
            <Button
              onClick={() => navigate("/employee-registration")}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <UserPlus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-3xl font-bold">{employees.length}</p>
                </div>
                <Users className="h-12 w-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-3xl font-bold text-green-600">
                    {employees.filter((e) => e.status === "active").length}
                  </p>
                </div>
                <Users className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">Departments</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {departments.length - 1}
                  </p>
                </div>
                <Filter className="h-12 w-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium">This Month</p>
                  <p className="text-3xl font-bold text-orange-600">+3</p>
                </div>
                <UserPlus className="h-12 w-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" /> <span>Employee Directory</span>
            </CardTitle>
            <CardDescription>
              Showing {filteredEmployees.length} of {employees.length} employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {employee.first_name[0]}
                      {employee.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-gray-600">{employee.position}</p>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge
                        variant={
                          employee.status === "active" ? "default" : "secondary"
                        }
                      >
                        {employee.status}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {employee.department}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/employee-view/${employee.id}`)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/employee-edit/${employee.id}`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() =>
                          handleDeleteEmployee(
                            employee.id,
                            `${employee.first_name} ${employee.last_name}`
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeManagement;

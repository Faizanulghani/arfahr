import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, User, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  name?: string;
  email?: string;
  department?: string;
  position?: string;
};

const EmployeeSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("employees").select("*");
    if (data) setEmployees(data);
    setLoading(false);
  };

  const filteredEmployees = employees.filter((employee) => {
    const name = employee.name?.toLowerCase() || "";
    const email = employee.email?.toLowerCase() || "";
    const dept = employee.department?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search) || dept.includes(search);
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Search className="h-5 w-5" />
          <span>Employee Search</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{employee.name || "Unnamed"}</h4>
                        <p className="text-sm text-gray-600">{employee.position || "—"}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{employee.email || "N/A"}</span>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {employee.department || "No Dept"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No employees found</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeSearch;

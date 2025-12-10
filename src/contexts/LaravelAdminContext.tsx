import React, { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  apiClient,
  AttendanceRecord,
  authAPI,
  employeeAPI,
  attendanceAPI,
} from "@/services/api";
import { supabase } from "@/lib/supabase"; // ✅ adjust path if needed

// Updated Employee interface to include status
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  employee_id: string;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
}

// Updated User interface to include role
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  department?: string;
}

interface AdminContextType {
  // Auth state
  isAuthenticated: boolean;
  user: User | null;

  // Data state
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];

  // Loading states
  loading: {
    auth: boolean;
    employees: boolean;
    attendance: boolean;
  };

  // Auth methods
  login: (email: string, password: string, role?: string) => Promise<boolean>;
  logout: () => void;

  // Employee methods
  addEmployee: (employee: Omit<Employee, "id">) => Promise<boolean>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  refreshEmployees: () => Promise<void>;

  // Attendance methods
  markAttendance: (
    employeeId: string,
    type: "check-in" | "check-out"
  ) => Promise<boolean>;
  refreshAttendance: (filters?: any) => Promise<void>;

  // Utility methods
  getEmployeeById: (id: string) => Employee | undefined;
  getAttendanceByEmployee: (
    employeeId: string,
    date?: string
  ) => AttendanceRecord[];
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  console.log("AdminProvider: Initializing provider");
  const { toast } = useToast();

  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Mock users for different roles
  const mockUsers: User[] = [
    {
      id: "1",
      name: "Admin User",
      email: "admin@afraexpress.com",
      role: "admin",
    },
    {
      id: "2",
      name: "Manager User",
      email: "manager@afraexpress.com",
      role: "manager",
      department: "Engineering",
    },
    {
      id: "3",
      name: "John Doe",
      email: "employee@afraexpress.com",
      role: "employee",
      department: "Engineering",
    },
  ];

  const [employees, setEmployees] = useState<Employee[]>([
    // Add some default employees with status for development
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@afraexpress.com",
      phone: "+1234567890",
      position: "Senior Developer",
      department: "Engineering",
      employee_id: "EMP001",
      status: "active",
    },
    {
      id: "2",
      name: "Sarah Smith",
      email: "sarah.smith@afraexpress.com",
      phone: "+1234567891",
      position: "HR Manager",
      department: "HR",
      employee_id: "EMP002",
      status: "active",
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@afraexpress.com",
      phone: "+1234567892",
      position: "Marketing Specialist",
      department: "Marketing",
      employee_id: "EMP003",
      status: "inactive",
    },
  ]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState({
    auth: false,
    employees: false,
    attendance: false,
  });

  // Check for existing auth token on mount
  // useEffect(() => {
  //   console.log("AdminProvider: useEffect - checking for existing auth token");
  //   const token = localStorage.getItem("auth_token");
  //   const savedUser = localStorage.getItem("auth_user");

  //   if (token && savedUser) {
  //     console.log(
  //       "AdminProvider: Found existing token and user, setting authenticated state"
  //     );
  //     try {
  //       const parsedUser = JSON.parse(savedUser);
  //       apiClient.setToken(token);
  //       setUser(parsedUser);
  //       setIsAuthenticated(true);
  //       // Load initial data
  //       refreshEmployees();
  //       refreshAttendance();
  //     } catch (error) {
  //       console.error("Error parsing saved user:", error);
  //       localStorage.removeItem("auth_token");
  //       localStorage.removeItem("auth_user");
  //     }
  //   } else {
  //     console.log("AdminProvider: No existing token found");
  //   }
  // }, []);

  useEffect(() => {
    console.log("AdminProvider: useEffect - checking for existing auth token");
    const newFetchin = async () => {
      const session = await supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setUser(data.session.user as User);
          setIsAuthenticated(true);
        }
        console.log("session", data.session);
      });
    };
    newFetchin();
  }, []);

  // Auth methods
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };

    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user?.id)
      .single();

    if (userFetchError || !userData)
      return {
        success: false,
        error: userFetchError?.message || "User not found",
      };

    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("auth_token", data.session.access_token);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    return { success: true };
  };
  const logout = async () => {
    console.log("AdminProvider: Logout called");
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear all auth data
      apiClient.clearToken();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");

      setIsAuthenticated(false);
      setUser(null);
      setEmployees([]);
      setAttendanceRecords([]);

      console.log("AdminProvider: Logout completed");
    }
  };

  // Employee methods
  const refreshEmployees = async () => {
    setLoading((prev) => ({ ...prev, employees: true }));

    try {
      const response = await employeeAPI.getAll();

      if (response.success && response.data) {
        // Ensure all employees have a status property
        const employeesWithStatus = response.data.map((emp) => ({
          ...emp,
          status: emp.status || ("active" as "active" | "inactive"),
        }));
        setEmployees(employeesWithStatus);
        console.log("AdminProvider: Employees loaded from API");
      } else {
        console.log("AdminProvider: Using default employees - API failed");
        // Keep default employees if API fails
      }
    } catch (error) {
      console.error("AdminProvider: Error fetching employees:", error);
      // Keep default employees if API fails
    } finally {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  };

  const addEmployee = async (
    employee: Omit<Employee, "id">
  ): Promise<boolean> => {
    try {
      const response = await employeeAPI.create(employee);

      if (response.success && response.data) {
        const newEmployee = {
          ...response.data,
          status: response.data.status || ("active" as "active" | "inactive"),
        };
        setEmployees((prev) => [...prev, newEmployee]);

        toast({
          title: "Success",
          description: "Employee added successfully",
        });

        return true;
      } else {
        // Fallback to local state for development
        const newEmployee: Employee = {
          ...employee,
          id: Date.now().toString(),
          status: employee.status || "active",
        };
        setEmployees((prev) => [...prev, newEmployee]);

        toast({
          title: "Success",
          description: "Employee added successfully (local)",
        });

        return true;
      }
    } catch (error) {
      console.error("AdminProvider: Error adding employee:", error);

      // Fallback to local state
      const newEmployee: Employee = {
        ...employee,
        id: Date.now().toString(),
        status: employee.status || "active",
      };
      setEmployees((prev) => [...prev, newEmployee]);

      toast({
        title: "Success",
        description: "Employee added successfully (local)",
      });

      return true;
    }
  };

  const updateEmployee = async (
    id: string,
    employeeData: Partial<Employee>
  ): Promise<boolean> => {
    try {
      const response = await employeeAPI.update(id, employeeData);

      if (response.success && response.data) {
        const updatedEmployee = {
          ...response.data,
          status: response.data.status || ("active" as "active" | "inactive"),
        };
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === id ? updatedEmployee : emp))
        );

        toast({
          title: "Success",
          description: "Employee updated successfully",
        });

        return true;
      } else {
        // Fallback to local state
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === id ? { ...emp, ...employeeData } : emp))
        );

        toast({
          title: "Success",
          description: "Employee updated successfully (local)",
        });

        return true;
      }
    } catch (error) {
      console.error("AdminProvider: Error updating employee:", error);

      // Fallback to local state
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === id ? { ...emp, ...employeeData } : emp))
      );

      toast({
        title: "Success",
        description: "Employee updated successfully (local)",
      });

      return true;
    }
  };

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      const response = await employeeAPI.delete(id);

      if (response.success) {
        setEmployees((prev) => prev.filter((emp) => emp.id !== id));

        toast({
          title: "Success",
          description: "Employee deleted successfully",
        });

        return true;
      } else {
        // Fallback to local state
        setEmployees((prev) => prev.filter((emp) => emp.id !== id));

        toast({
          title: "Success",
          description: "Employee deleted successfully (local)",
        });

        return true;
      }
    } catch (error) {
      console.error("AdminProvider: Error deleting employee:", error);

      // Fallback to local state
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));

      toast({
        title: "Success",
        description: "Employee deleted successfully (local)",
      });

      return true;
    }
  };

  // Attendance methods
  const refreshAttendance = async (filters?: any) => {
    setLoading((prev) => ({ ...prev, attendance: true }));

    try {
      const response = await attendanceAPI.getRecords(filters);

      if (response.success && response.data) {
        setAttendanceRecords(response.data);
        console.log("AdminProvider: Attendance records loaded from API");
      } else {
        console.log("AdminProvider: Using default attendance - API failed");
        // Generate some mock attendance records
        const mockRecords: AttendanceRecord[] = [
          {
            id: "1",
            employee_id: "1",
            date: new Date().toISOString().split("T")[0],
            check_in: "09:00",
            check_out: "17:00",
            status: "present",
          },
          {
            id: "2",
            employee_id: "2",
            date: new Date().toISOString().split("T")[0],
            check_in: "09:15",
            check_out: null,
            status: "late",
          },
        ];
        setAttendanceRecords(mockRecords);
      }
    } catch (error) {
      console.error("AdminProvider: Error fetching attendance:", error);
      // Generate some mock attendance records
      const mockRecords: AttendanceRecord[] = [
        {
          id: "1",
          employee_id: "1",
          date: new Date().toISOString().split("T")[0],
          check_in: "09:00",
          check_out: "17:00",
          status: "present",
        },
        {
          id: "2",
          employee_id: "2",
          date: new Date().toISOString().split("T")[0],
          check_in: "09:15",
          check_out: null,
          status: "late",
        },
      ];
      setAttendanceRecords(mockRecords);
    } finally {
      setLoading((prev) => ({ ...prev, attendance: false }));
    }
  };

  const markAttendance = async (
    employeeId: string,
    type: "check-in" | "check-out"
  ): Promise<boolean> => {
    try {
      const response = await attendanceAPI.markAttendance(employeeId, type);

      if (response.success && response.data) {
        // Update local state
        setAttendanceRecords((prev) => {
          const existing = prev.find(
            (r) =>
              r.employee_id === employeeId &&
              r.date === new Date().toISOString().split("T")[0]
          );

          if (existing) {
            return prev.map((r) => (r.id === existing.id ? response.data! : r));
          } else {
            return [...prev, response.data!];
          }
        });

        const employee = getEmployeeById(employeeId);
        toast({
          title: "Success",
          description: `${employee?.name || "Employee"} ${
            type === "check-in" ? "checked in" : "checked out"
          } successfully`,
        });

        return true;
      } else {
        // Fallback to local mock
        const mockRecord: AttendanceRecord = {
          id: Date.now().toString(),
          employee_id: employeeId,
          date: new Date().toISOString().split("T")[0],
          check_in:
            type === "check-in"
              ? new Date().toTimeString().split(" ")[0].substring(0, 5)
              : null,
          check_out:
            type === "check-out"
              ? new Date().toTimeString().split(" ")[0].substring(0, 5)
              : null,
          status: "present",
        };

        setAttendanceRecords((prev) => {
          const existing = prev.find(
            (r) =>
              r.employee_id === employeeId &&
              r.date === new Date().toISOString().split("T")[0]
          );

          if (existing) {
            return prev.map((r) =>
              r.id === existing.id
                ? {
                    ...r,
                    check_in:
                      type === "check-in" ? mockRecord.check_in : r.check_in,
                    check_out:
                      type === "check-out" ? mockRecord.check_out : r.check_out,
                  }
                : r
            );
          } else {
            return [...prev, mockRecord];
          }
        });

        const employee = getEmployeeById(employeeId);
        toast({
          title: "Success",
          description: `${employee?.name || "Employee"} ${
            type === "check-in" ? "checked in" : "checked out"
          } successfully (local)`,
        });

        return true;
      }
    } catch (error) {
      console.error("AdminProvider: Error marking attendance:", error);

      // Fallback to local mock
      const mockRecord: AttendanceRecord = {
        id: Date.now().toString(),
        employee_id: employeeId,
        date: new Date().toISOString().split("T")[0],
        check_in:
          type === "check-in"
            ? new Date().toTimeString().split(" ")[0].substring(0, 5)
            : null,
        check_out:
          type === "check-out"
            ? new Date().toTimeString().split(" ")[0].substring(0, 5)
            : null,
        status: "present",
      };

      setAttendanceRecords((prev) => {
        const existing = prev.find(
          (r) =>
            r.employee_id === employeeId &&
            r.date === new Date().toISOString().split("T")[0]
        );

        if (existing) {
          return prev.map((r) =>
            r.id === existing.id
              ? {
                  ...r,
                  check_in:
                    type === "check-in" ? mockRecord.check_in : r.check_in,
                  check_out:
                    type === "check-out" ? mockRecord.check_out : r.check_out,
                }
              : r
          );
        } else {
          return [...prev, mockRecord];
        }
      });

      const employee = getEmployeeById(employeeId);
      toast({
        title: "Success",
        description: `${employee?.name || "Employee"} ${
          type === "check-in" ? "checked in" : "checked out"
        } successfully (local)`,
      });

      return true;
    }
  };

  // Utility methods
  const getEmployeeById = (id: string): Employee | undefined => {
    return employees.find((emp) => emp.id === id);
  };

  const getAttendanceByEmployee = (
    employeeId: string,
    date?: string
  ): AttendanceRecord[] => {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return attendanceRecords.filter(
      (record) =>
        record.employee_id === employeeId && record.date === targetDate
    );
  };

  const value: AdminContextType = {
    // Auth state
    isAuthenticated,
    user,

    // Data state
    employees,
    attendanceRecords,

    // Loading states
    loading,

    // Auth methods
    login,
    logout,

    // Employee methods
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,

    // Attendance methods
    markAttendance,
    refreshAttendance,

    // Utility methods
    getEmployeeById,
    getAttendanceByEmployee,
  };

  console.log("AdminProvider: Rendering provider with auth state:", {
    isAuthenticated,
    user: user?.name,
  });

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};

export const useAdmin = () => {
  console.log("useAdmin: Hook called");
  const context = useContext(AdminContext);
  console.log("useAdmin: Context value:", context ? "exists" : "undefined");

  if (context === undefined) {
    console.error(
      "useAdmin: Context is undefined - AdminProvider not found in component tree"
    );
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

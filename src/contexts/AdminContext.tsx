import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'hr';
  department?: string;
}

interface AdminContextType {
  user: User | null;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addEmployee: (employee: Omit<Employee, 'id'>) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  markAttendance: (employeeId: string, type: 'check-in' | 'check-out') => void;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  joinDate: string;
  status: 'active' | 'inactive';
  photo?: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half-day';
  workingHours?: number;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@afraexpress.com',
      department: 'Engineering',
      position: 'Senior Developer',
      joinDate: '2023-01-15',
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Smith',
      email: 'sarah.smith@afraexpress.com',
      department: 'HR',
      position: 'HR Manager',
      joinDate: '2022-11-20',
      status: 'active'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@afraexpress.com',
      department: 'Marketing',
      position: 'Marketing Specialist',
      joinDate: '2023-03-10',
      status: 'active'
    }
  ]);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: '1',
      employeeId: '1',
      employeeName: 'John Doe',
      date: new Date().toISOString().split('T')[0],
      checkIn: '09:15',
      checkOut: '17:30',
      status: 'present',
      workingHours: 8.25
    },
    {
      id: '2',
      employeeId: '2',
      employeeName: 'Sarah Smith',
      date: new Date().toISOString().split('T')[0],
      checkIn: '08:45',
      checkOut: '17:00',
      status: 'present',
      workingHours: 8.25
    }
  ]);

  useEffect(() => {
    const loginStatus = localStorage.getItem('isLoggedIn');
    const userEmail = localStorage.getItem('userEmail');
    if (loginStatus && userEmail) {
      setUser({
        id: '1',
        email: userEmail,
        name: 'Admin User',
        role: 'admin'
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email === 'admin@afraexpress.com' && password === 'admin123') {
      const adminUser = {
        id: '1',
        email,
        name: 'Admin User',
        role: 'admin' as const
      };
      setUser(adminUser);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', email);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('rememberMe');
  };

  const addEmployee = (newEmployee: Omit<Employee, 'id'>) => {
    const employee: Employee = {
      ...newEmployee,
      id: Date.now().toString()
    };
    setEmployees(prev => [...prev, employee]);
  };

  const updateEmployee = (id: string, updatedEmployee: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === id ? { ...emp, ...updatedEmployee } : emp
    ));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    setAttendanceRecords(prev => prev.filter(record => record.employeeId !== id));
  };

  const markAttendance = (employeeId: string, type: 'check-in' | 'check-out') => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    setAttendanceRecords(prev => {
      const existingRecord = prev.find(record => 
        record.employeeId === employeeId && record.date === today
      );

      if (existingRecord) {
        return prev.map(record => {
          if (record.id === existingRecord.id) {
            const updatedRecord = { ...record };
            if (type === 'check-out') {
              updatedRecord.checkOut = currentTime;
              if (updatedRecord.checkIn) {
                const checkIn = new Date(`${today} ${updatedRecord.checkIn}`);
                const checkOut = new Date(`${today} ${currentTime}`);
                updatedRecord.workingHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
              }
            }
            return updatedRecord;
          }
          return record;
        });
      } else if (type === 'check-in') {
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          employeeId,
          employeeName: employee.name,
          date: today,
          checkIn: currentTime,
          status: 'present'
        };
        return [...prev, newRecord];
      }
      return prev;
    });
  };

  const value: AdminContextType = {
    user,
    employees,
    attendanceRecords,
    login,
    logout,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    markAttendance
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
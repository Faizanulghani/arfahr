// Database service for handling data operations
import { 
  Employee, 
  AttendanceRecord, 
  SalaryStructure, 
  PayrollRecord, 
  Shift,
  LeaveRequest,
  Notification,
  EmployeeAttendanceSummary,
  MonthlyPayrollSummary
} from '@/types/database';

// Mock data service - In production, this would connect to your actual database
class DatabaseService {
  // =============================================
  // EMPLOYEES
  // =============================================
  async getEmployees(filters?: any): Promise<Employee[]> {
    // Mock implementation - replace with actual database query
    const mockEmployees: Employee[] = [
      {
        id: '1',
        employee_id: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@afraexpress.com',
        phone: '+1234567890',
        position: 'Senior Developer',
        department: 'Engineering',
        hire_date: '2023-01-15',
        status: 'active',
        address: '123 Main St, City',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+1234567891',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      },
      {
        id: '2',
        employee_id: 'EMP002',
        name: 'Sarah Smith',
        email: 'sarah.smith@afraexpress.com',
        phone: '+1234567892',
        position: 'HR Manager',
        department: 'HR',
        hire_date: '2023-02-01',
        status: 'active',
        created_at: '2023-02-01T00:00:00Z',
        updated_at: '2023-02-01T00:00:00Z'
      },
      {
        id: '3',
        employee_id: 'EMP003',
        name: 'Mike Johnson',
        email: 'mike.johnson@afraexpress.com',
        phone: '+1234567893',
        position: 'Marketing Specialist',
        department: 'Marketing',
        hire_date: '2023-03-01',
        status: 'active',
        created_at: '2023-03-01T00:00:00Z',
        updated_at: '2023-03-01T00:00:00Z'
      }
    ];

    return mockEmployees;
  }

  async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    const newEmployee: Employee = {
      ...employeeData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return newEmployee;
  }

  async updateEmployee(id: string, employeeData: Partial<Employee>): Promise<Employee> {
    // Mock implementation
    return {
      id,
      ...employeeData,
      updated_at: new Date().toISOString()
    } as Employee;
  }

  // =============================================
  // ATTENDANCE
  // =============================================
  async getAttendanceRecords(filters?: any): Promise<AttendanceRecord[]> {
    const today = new Date().toISOString().split('T')[0];
    const mockAttendance: AttendanceRecord[] = [
      {
        id: '1',
        employee_id: '1',
        date: today,
        check_in: '09:00',
        check_out: '17:00',
        status: 'present',
        total_hours: 8,
        overtime_hours: 0,
        break_duration: 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        employee_id: '2',
        date: today,
        check_in: '09:15',
        status: 'late',
        total_hours: 0,
        overtime_hours: 0,
        break_duration: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockAttendance;
  }

  async markAttendance(employeeId: string, type: 'check-in' | 'check-out', timestamp: string): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const time = new Date(timestamp).toTimeString().split(' ')[0].substring(0, 5);

    const attendanceRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employee_id: employeeId,
      date: today,
      check_in: type === 'check-in' ? time : undefined,
      check_out: type === 'check-out' ? time : undefined,
      status: 'present',
      total_hours: 0,
      overtime_hours: 0,
      break_duration: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return attendanceRecord;
  }

  // =============================================
  // SHIFTS
  // =============================================
  async getShifts(): Promise<Shift[]> {
    const mockShifts: Shift[] = [
      {
        id: '1',
        name: 'Morning Shift',
        start_time: '09:00:00',
        end_time: '17:00:00',
        break_duration: 60,
        is_active: true,
        description: 'Standard morning shift',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Evening Shift',
        start_time: '14:00:00',
        end_time: '22:00:00',
        break_duration: 60,
        is_active: true,
        description: 'Evening shift',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockShifts;
  }

  // =============================================
  // SALARY STRUCTURES
  // =============================================
  async getSalaryStructures(employeeId?: string): Promise<SalaryStructure[]> {
    const mockSalaries: SalaryStructure[] = [
      {
        id: '1',
        employee_id: '1',
        basic_salary: 50000,
        house_allowance: 10000,
        transport_allowance: 5000,
        medical_allowance: 3000,
        other_allowances: 2000,
        gross_salary: 70000,
        tax_deduction: 7000,
        insurance_deduction: 2000,
        other_deductions: 1000,
        net_salary: 60000,
        effective_date: '2023-01-01',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return employeeId ? mockSalaries.filter(s => s.employee_id === employeeId) : mockSalaries;
  }

  // =============================================
  // PAYROLL
  // =============================================
  async getPayrollRecords(filters?: any): Promise<PayrollRecord[]> {
    const mockPayroll: PayrollRecord[] = [
      {
        id: '1',
        employee_id: '1',
        salary_structure_id: '1',
        pay_period_start: '2024-01-01',
        pay_period_end: '2024-01-31',
        working_days: 22,
        present_days: 20,
        absent_days: 2,
        late_days: 1,
        overtime_hours: 5,
        basic_salary: 50000,
        allowances: 20000,
        overtime_amount: 2000,
        gross_salary: 72000,
        deductions: 10000,
        net_salary: 62000,
        bonus: 0,
        final_amount: 62000,
        status: 'paid',
        payment_date: '2024-02-01',
        payment_method: 'bank_transfer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return mockPayroll;
  }

  async processPayroll(employeeIds: string[], payPeriodStart: string, payPeriodEnd: string): Promise<PayrollRecord[]> {
    // Mock payroll processing
    const processedPayroll: PayrollRecord[] = employeeIds.map(employeeId => ({
      id: Date.now().toString() + employeeId,
      employee_id: employeeId,
      salary_structure_id: '1',
      pay_period_start: payPeriodStart,
      pay_period_end: payPeriodEnd,
      working_days: 22,
      present_days: 20,
      absent_days: 2,
      late_days: 0,
      overtime_hours: 0,
      basic_salary: 50000,
      allowances: 20000,
      overtime_amount: 0,
      gross_salary: 70000,
      deductions: 10000,
      net_salary: 60000,
      bonus: 0,
      final_amount: 60000,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    return processedPayroll;
  }

  // =============================================
  // REPORTS & ANALYTICS
  // =============================================
  async getEmployeeAttendanceSummary(employeeId?: string): Promise<EmployeeAttendanceSummary[]> {
    const mockSummary: EmployeeAttendanceSummary[] = [
      {
        employee_id: '1',
        name: 'John Doe',
        department: 'Engineering',
        total_attendance_records: 22,
        present_days: 20,
        absent_days: 2,
        late_days: 1,
        avg_daily_hours: 8.2,
        total_overtime_hours: 5
      },
      {
        employee_id: '2',
        name: 'Sarah Smith',
        department: 'HR',
        total_attendance_records: 22,
        present_days: 22,
        absent_days: 0,
        late_days: 0,
        avg_daily_hours: 8.0,
        total_overtime_hours: 2
      }
    ];

    return employeeId ? mockSummary.filter(s => s.employee_id === employeeId) : mockSummary;
  }

  async getMonthlyPayrollSummary(): Promise<MonthlyPayrollSummary[]> {
    const mockSummary: MonthlyPayrollSummary[] = [
      {
        month: '2024-01',
        total_employees: 25,
        total_gross_salary: 1750000,
        total_deductions: 250000,
        total_net_salary: 1500000,
        avg_net_salary: 60000
      },
      {
        month: '2023-12',
        total_employees: 23,
        total_gross_salary: 1610000,
        total_deductions: 230000,
        total_net_salary: 1380000,
        avg_net_salary: 60000
      }
    ];
    
    return mockSummary;
  }

  // =============================================
  // NOTIFICATIONS
  // =============================================
  async getNotifications(userId: string): Promise<Notification[]> {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        user_id: userId,
        title: 'Attendance Reminder',
        message: 'Please mark your attendance for today',
        type: 'info',
        is_read: false,
        related_entity: 'attendance',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: userId,
        title: 'Payroll Processed',
        message: 'Your payroll for January has been processed',
        type: 'success',
        is_read: false,
        related_entity: 'payroll',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    return mockNotifications;
  }
}

export const databaseService = new DatabaseService();
export default databaseService;
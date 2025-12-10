// Database types for AfraExpress HR Management System

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  department?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  position: string;
  department: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'terminated';
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  biometric_data?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_id: string;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  shift_id?: string;
  check_in?: string;
  check_out?: string;
  break_start?: string;
  break_end?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'overtime';
  total_hours: number;
  overtime_hours: number;
  break_duration: number;
  location_check_in?: string;
  location_check_out?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  house_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: number;
  gross_salary: number;
  tax_deduction: number;
  insurance_deduction: number;
  other_deductions: number;
  net_salary: number;
  effective_date: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollRecord {
  id: string;
  employee_id: string;
  salary_structure_id: string;
  pay_period_start: string;
  pay_period_end: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  overtime_hours: number;
  basic_salary: number;
  allowances: number;
  overtime_amount: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  bonus: number;
  final_amount: number;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  processed_by?: string;
  processed_at?: string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  days_allowed: number;
  is_paid: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  related_entity?: string;
  related_entity_id?: string;
  created_at: string;
  read_at?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value?: string;
  setting_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_public: boolean;
  updated_by?: string;
  updated_at: string;
}

// View types
export interface EmployeeAttendanceSummary {
  employee_id: string;
  name: string;
  department: string;
  total_attendance_records: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  avg_daily_hours: number;
  total_overtime_hours: number;
}

export interface MonthlyPayrollSummary {
  month: string;
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  avg_net_salary: number;
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  expires_in: number;
}

export interface AttendanceMarkRequest {
  employee_id: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
  location?: string;
}

export interface PayrollProcessRequest {
  employee_ids: string[];
  pay_period_start: string;
  pay_period_end: string;
}

// Filter types
export interface AttendanceFilter {
  employee_id?: string;
  department?: string;
  date_from?: string;
  date_to?: string;
  status?: string[];
}

export interface PayrollFilter {
  employee_id?: string;
  department?: string;
  pay_period_start?: string;
  pay_period_end?: string;
  status?: string[];
}

export interface EmployeeFilter {
  department?: string;
  status?: string[];
  position?: string;
  search?: string;
}
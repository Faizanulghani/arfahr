-- AfraExpress HR Management System Database Schema
-- This schema includes Users, Employees, Attendance, Shifts, Salary, and Payroll management

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (Authentication & Role Management)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_department (department)
);

-- =============================================
-- EMPLOYEES TABLE (Employee Information)
-- =============================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) UNIQUE NOT NULL, -- Custom employee ID like EMP001
    user_id UUID, -- Reference to users table (nullable for non-system employees)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    position VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    biometric_data TEXT, -- For fingerprint storage (encrypted)
    profile_image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_employees_employee_id (employee_id),
    INDEX idx_employees_department (department),
    INDEX idx_employees_status (status),
    INDEX idx_employees_hire_date (hire_date)
);

-- =============================================
-- SHIFTS TABLE (Shift Configuration)
-- =============================================
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g., "Morning Shift", "Night Shift"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INTEGER DEFAULT 0, -- Break duration in minutes
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_shifts_name (name),
    INDEX idx_shifts_active (is_active)
);

-- =============================================
-- EMPLOYEE_SHIFTS TABLE (Employee Shift Assignments)
-- =============================================
CREATE TABLE employee_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    shift_id UUID NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE, -- NULL means current assignment
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    INDEX idx_employee_shifts_employee (employee_id),
    INDEX idx_employee_shifts_shift (shift_id),
    INDEX idx_employee_shifts_date (effective_date),
    UNIQUE KEY unique_active_assignment (employee_id, effective_date, is_active)
);

-- =============================================
-- ATTENDANCE TABLE (Daily Attendance Records)
-- =============================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    shift_id UUID,
    check_in TIME,
    check_out TIME,
    break_start TIME,
    break_end TIME,
    status ENUM('present', 'absent', 'late', 'half_day', 'overtime') NOT NULL,
    total_hours DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    break_duration INTEGER DEFAULT 0, -- in minutes
    location_check_in VARCHAR(255), -- GPS location
    location_check_out VARCHAR(255), -- GPS location
    notes TEXT,
    approved_by UUID, -- Manager who approved
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_attendance_employee_date (employee_id, date),
    INDEX idx_attendance_date (date),
    INDEX idx_attendance_status (status),
    UNIQUE KEY unique_daily_attendance (employee_id, date)
);

-- =============================================
-- SALARY_STRUCTURES TABLE (Salary Components)
-- =============================================
CREATE TABLE salary_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    house_allowance DECIMAL(10,2) DEFAULT 0,
    transport_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) GENERATED ALWAYS AS (
        basic_salary + house_allowance + transport_allowance + medical_allowance + other_allowances
    ) STORED,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    insurance_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) GENERATED ALWAYS AS (
        gross_salary - tax_deduction - insurance_deduction - other_deductions
    ) STORED,
    effective_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    INDEX idx_salary_employee (employee_id),
    INDEX idx_salary_effective_date (effective_date),
    INDEX idx_salary_active (is_active)
);

-- =============================================
-- PAYROLL TABLE (Monthly Payroll Processing)
-- =============================================
CREATE TABLE payroll (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    salary_structure_id UUID NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    working_days INTEGER NOT NULL,
    present_days INTEGER NOT NULL,
    absent_days INTEGER NOT NULL,
    late_days INTEGER DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    basic_salary DECIMAL(10,2) NOT NULL,
    allowances DECIMAL(10,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    bonus DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) GENERATED ALWAYS AS (net_salary + bonus) STORED,
    status ENUM('draft', 'approved', 'paid', 'cancelled') DEFAULT 'draft',
    processed_by UUID,
    processed_at TIMESTAMP,
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (salary_structure_id) REFERENCES salary_structures(id) ON DELETE RESTRICT,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_payroll_employee (employee_id),
    INDEX idx_payroll_period (pay_period_start, pay_period_end),
    INDEX idx_payroll_status (status),
    UNIQUE KEY unique_employee_period (employee_id, pay_period_start, pay_period_end)
);

-- =============================================
-- LEAVE_TYPES TABLE (Types of Leaves)
-- =============================================
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g., "Annual Leave", "Sick Leave", "Maternity Leave"
    days_allowed INTEGER NOT NULL, -- Annual allowance
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_leave_types_name (name),
    INDEX idx_leave_types_active (is_active)
);

-- =============================================
-- LEAVE_REQUESTS TABLE (Employee Leave Requests)
-- =============================================
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_requests_employee (employee_id),
    INDEX idx_leave_requests_dates (start_date, end_date),
    INDEX idx_leave_requests_status (status)
);

-- =============================================
-- NOTIFICATIONS TABLE (System Notifications)
-- =============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    related_entity VARCHAR(50), -- e.g., 'attendance', 'payroll', 'leave'
    related_entity_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at)
);

-- =============================================
-- AUDIT_LOGS TABLE (System Activity Tracking)
-- =============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE'
    entity_type VARCHAR(50) NOT NULL, -- e.g., 'employee', 'attendance', 'payroll'
    entity_id UUID,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created (created_at)
);

-- =============================================
-- SYSTEM_SETTINGS TABLE (Application Configuration)
-- =============================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Whether setting can be accessed by non-admin users
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_system_settings_key (setting_key),
    INDEX idx_system_settings_public (is_public)
);

-- =============================================
-- INSERT DEFAULT DATA
-- =============================================

-- Insert default admin user
INSERT INTO users (email, password_hash, name, role) VALUES 
('admin@afraexpress.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin');

-- Insert default shift types
INSERT INTO shifts (name, start_time, end_time, break_duration, description) VALUES 
('Morning Shift', '09:00:00', '17:00:00', 60, 'Standard morning shift with 1 hour break'),
('Evening Shift', '14:00:00', '22:00:00', 60, 'Evening shift with 1 hour break'),
('Night Shift', '22:00:00', '06:00:00', 60, 'Night shift with 1 hour break');

-- Insert default leave types
INSERT INTO leave_types (name, days_allowed, is_paid, description) VALUES 
('Annual Leave', 20, TRUE, 'Annual vacation leave'),
('Sick Leave', 10, TRUE, 'Medical leave for illness'),
('Maternity Leave', 90, TRUE, 'Maternity leave for mothers'),
('Paternity Leave', 15, TRUE, 'Paternity leave for fathers'),
('Emergency Leave', 5, FALSE, 'Emergency or personal leave');

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES 
('company_name', 'AfraExpress', 'string', 'Company name', TRUE),
('working_hours_per_day', '8', 'number', 'Standard working hours per day', TRUE),
('overtime_rate', '1.5', 'number', 'Overtime rate multiplier', FALSE),
('late_penalty_minutes', '15', 'number', 'Grace period for late arrival', FALSE),
('payroll_cycle', 'monthly', 'string', 'Payroll processing cycle', FALSE);

-- =============================================
-- CREATE VIEWS FOR COMMON QUERIES
-- =============================================

-- Employee attendance summary view
CREATE VIEW employee_attendance_summary AS
SELECT 
    e.id as employee_id,
    e.name,
    e.department,
    COUNT(a.id) as total_attendance_records,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
    SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_days,
    AVG(a.total_hours) as avg_daily_hours,
    SUM(a.overtime_hours) as total_overtime_hours
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id
WHERE e.status = 'active'
GROUP BY e.id, e.name, e.department;

-- Monthly payroll summary view
CREATE VIEW monthly_payroll_summary AS
SELECT 
    DATE_FORMAT(pay_period_start, '%Y-%m') as month,
    COUNT(*) as total_employees,
    SUM(gross_salary) as total_gross_salary,
    SUM(deductions) as total_deductions,
    SUM(net_salary) as total_net_salary,
    AVG(net_salary) as avg_net_salary
FROM payroll 
WHERE status = 'paid'
GROUP BY DATE_FORMAT(pay_period_start, '%Y-%m')
ORDER BY month DESC;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  employee_id: string;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'absent' | 'late';
  created_at?: string;
  updated_at?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  token: string;
}

// HTTP Client class
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Request failed',
          errors: data.errors,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        message: 'Network error occurred',
      };
    }
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.request<null>('/auth/logout', {
      method: 'POST',
    });
    this.clearToken();
    return response;
  }

  // Employee endpoints
  async getEmployees(): Promise<ApiResponse<Employee[]>> {
    return this.request<Employee[]>('/employees');
  }

  async createEmployee(employee: Omit<Employee, 'id'>): Promise<ApiResponse<Employee>> {
    return this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(id: string, employee: Partial<Employee>): Promise<ApiResponse<Employee>> {
    return this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employee),
    });
  }

  async deleteEmployee(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance endpoints
  async getAttendanceRecords(filters?: {
    employee_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<ApiResponse<AttendanceRecord[]>> {
    const params = new URLSearchParams();
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const queryString = params.toString();
    const endpoint = queryString ? `/attendance?${queryString}` : '/attendance';
    
    return this.request<AttendanceRecord[]>(endpoint);
  }

  async markAttendance(employeeId: string, type: 'check-in' | 'check-out'): Promise<ApiResponse<AttendanceRecord>> {
    return this.request<AttendanceRecord>('/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        type: type,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  // Biometric endpoints
  async verifyFingerprint(fingerprintData: string): Promise<ApiResponse<{ employee_id: string }>> {
    return this.request<{ employee_id: string }>('/biometric/verify', {
      method: 'POST',
      body: JSON.stringify({
        fingerprint_data: fingerprintData,
      }),
    });
  }

  async enrollFingerprint(employeeId: string, fingerprintData: string): Promise<ApiResponse<null>> {
    return this.request<null>('/biometric/enroll', {
      method: 'POST',
      body: JSON.stringify({
        employee_id: employeeId,
        fingerprint_data: fingerprintData,
      }),
    });
  }

  // Reports endpoints
  async getAttendanceReport(filters: {
    date_from: string;
    date_to: string;
    employee_id?: string;
    department?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return this.request<any>(`/reports/attendance?${params.toString()}`);
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Helper functions for common operations
export const authAPI = {
  login: (credentials: LoginCredentials) => apiClient.login(credentials),
  logout: () => apiClient.logout(),
};

export const employeeAPI = {
  getAll: () => apiClient.getEmployees(),
  create: (employee: Omit<Employee, 'id'>) => apiClient.createEmployee(employee),
  update: (id: string, employee: Partial<Employee>) => apiClient.updateEmployee(id, employee),
  delete: (id: string) => apiClient.deleteEmployee(id),
};

export const attendanceAPI = {
  getRecords: (filters?: Parameters<typeof apiClient.getAttendanceRecords>[0]) => 
    apiClient.getAttendanceRecords(filters),
  markAttendance: (employeeId: string, type: 'check-in' | 'check-out') => 
    apiClient.markAttendance(employeeId, type),
};

export const biometricAPI = {
  verify: (fingerprintData: string) => apiClient.verifyFingerprint(fingerprintData),
  enroll: (employeeId: string, fingerprintData: string) => 
    apiClient.enrollFingerprint(employeeId, fingerprintData),
};

export const reportsAPI = {
  getAttendanceReport: (filters: Parameters<typeof apiClient.getAttendanceReport>[0]) => 
    apiClient.getAttendanceReport(filters),
};
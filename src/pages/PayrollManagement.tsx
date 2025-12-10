import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Receipt,
  Search,
  Plus,
  Download,
  Eye,
  LogOut,
  Calendar,
  DollarSign,
  TrendingUp,
  Calculator,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase"; 

interface PayrollRecord {
  id: string;
  user_id: string;
  employee_name: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  regular_hours: number;
  overtime_hours: number;
  basic_pay: number;
  overtime_pay: number;
  allowances: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  bonus: number;
  status: 'draft' | 'processed' | 'paid' | 'cancelled';
  pay_date: string;
  created_at: string;
  updated_at: string;
}

const PayrollManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  // Mock data - in real app this would come from API
  const [payrollRecords] = useState<PayrollRecord[]>([
    {
      id: '1',
      user_id: '1',
      employee_name: 'John Doe',
      employee_id: 'EMP001',
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      regular_hours: 160,
      overtime_hours: 8,
      basic_pay: 50000,
      overtime_pay: 4000,
      allowances: 26000,
      gross_pay: 80000,
      deductions: 15000,
      net_pay: 65000,
      bonus: 5000,
      status: 'paid',
      pay_date: '2024-02-01',
      created_at: '2024-01-31T08:00:00Z',
      updated_at: '2024-02-01T08:00:00Z'
    },
    {
      id: '2',
      user_id: '2',
      employee_name: 'Sarah Smith',
      employee_id: 'EMP002',
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      regular_hours: 160,
      overtime_hours: 12,
      basic_pay: 60000,
      overtime_pay: 7200,
      allowances: 32000,
      gross_pay: 99200,
      deductions: 19000,
      net_pay: 80200,
      bonus: 8000,
      status: 'processed',
      pay_date: '2024-02-01',
      created_at: '2024-01-31T08:00:00Z',
      updated_at: '2024-02-01T08:00:00Z'
    },
    {
      id: '3',
      user_id: '3',
      employee_name: 'Mike Johnson',
      employee_id: 'EMP003',
      pay_period_start: '2024-01-01',
      pay_period_end: '2024-01-31',
      regular_hours: 152,
      overtime_hours: 0,
      basic_pay: 45000,
      overtime_pay: 0,
      allowances: 21000,
      gross_pay: 66000,
      deductions: 12500,
      net_pay: 53500,
      bonus: 0,
      status: 'draft',
      pay_date: '2024-02-01',
      created_at: '2024-01-31T08:00:00Z',
      updated_at: '2024-01-31T08:00:00Z'
    }
  ]);

  const statuses = ["all", "draft", "processed", "paid", "cancelled"];
  const months = ["all", "january", "february", "march", "april", "may", "june"];

  const filteredPayroll = payrollRecords.filter(record => {
    const matchesSearch =
      record.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || record.status === filterStatus;

    const matchesMonth = filterMonth === "all" ||
      new Date(record.pay_period_start).toLocaleString('default', { month: 'long' }).toLowerCase() === filterMonth;

    return matchesSearch && matchesStatus && matchesMonth;
  });

  const handleProcessPayroll = (id: string, name: string) => {
    if (window.confirm(`Process payroll for ${name}?`)) {
      toast({
        title: "Payroll Processed",
        description: `Payroll for ${name} has been processed successfully`
      });
    }
  };

  const handleMarkAsPaid = (id: string, name: string) => {
    if (window.confirm(`Mark payroll as paid for ${name}?`)) {
      toast({
        title: "Payroll Marked as Paid",
        description: `Payroll for ${name} has been marked as paid`
      });
    }
  };

  // Demo-only logout (no auth context)
  const handleLogout = () => {
    toast({
      title: "Logout",
      description: "Logout action is disabled in this demo build."
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'processed': return <Clock className="h-4 w-4" />;
      case 'draft': return <Calendar className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Receipt className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Payroll Management
                </h1>
                <p className="text-sm text-gray-600">Process and manage employee payroll</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                Dashboard
              </Button>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statuses.map(status => (
                <option key={status} value={status}>
                  {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map(month => (
                <option key={month} value={month}>
                  {month === "all" ? "All Months" : month.charAt(0).toUpperCase() + month.slice(1)}
                </option>
              ))}
            </select>
            <Button
              onClick={() => toast({ title: "Feature Coming Soon", description: "Bulk payroll processing will be available soon" })}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Run Payroll
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-3xl font-bold">{payrollRecords.length}</p>
                </div>
                <Receipt className="h-12 w-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      payrollRecords
                        .filter(r => r.status === 'paid')
                        .reduce((sum, r) => sum + r.net_pay, 0)
                    )}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(
                      payrollRecords
                        .filter(r => r.status === 'processed' || r.status === 'draft')
                        .reduce((sum, r) => sum + r.net_pay, 0)
                    )}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Pay</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(
                      payrollRecords.reduce((sum, r) => sum + r.net_pay, 0) / payrollRecords.length
                    )}
                  </p>
                </div>
                <TrendingUp className="h-12 w-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Payroll Records</span>
            </CardTitle>
            <CardDescription>
              Showing {filteredPayroll.length} of {payrollRecords.length} payroll records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {record.employee_name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-semibold">{record.employee_name}</p>
                            <p className="text-sm text-gray-500">{record.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(record.pay_period_start).toLocaleDateString()} - 
                            {new Date(record.pay_period_end).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(record.pay_period_start).toLocaleString('default', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.regular_hours + record.overtime_hours}h</p>
                          <p className="text-sm text-gray-500">
                            {record.regular_hours}h reg + {record.overtime_hours}h OT
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-green-600">
                            {formatCurrency(record.gross_pay)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Basic: {formatCurrency(record.basic_pay)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-red-600">
                            -{formatCurrency(record.deductions)}
                          </p>
                          <p className="text-sm text-gray-500">Tax & others</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-lg text-blue-600">
                            {formatCurrency(record.net_pay)}
                          </p>
                          {record.bonus > 0 && (
                            <p className="text-sm text-green-600">
                              +{formatCurrency(record.bonus)} bonus
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(record.status)} flex items-center space-x-1`}>
                          {getStatusIcon(record.status)}
                          <span>{record.status.charAt(0).toUpperCase() + record.status.slice(1)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          {record.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleProcessPayroll(record.id, record.employee_name)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          )}
                          {record.status === 'processed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkAsPaid(record.id, record.employee_name)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayrollManagement;

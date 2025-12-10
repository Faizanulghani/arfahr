import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Download, Calendar, Filter, ArrowLeft,
  Users, Clock, TrendingUp, FileText, CheckCircle, XCircle,
  AlertCircle, Building2, PieChart
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late";
  employeeId: string;
  employeeName: string;
  workingHours?: number;
}

interface Employee {
  id: string;
  name: string;
}


const Reports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();


  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReport, setSelectedReport] = useState("summary");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);


  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);

    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(lastMonth.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: employeesData } = await supabase.from("employees").select("*");
      const { data: attendancesData } = await supabase.from("attendances").select("*");
      setEmployees(employeesData || []);
      setAttendanceRecords(attendancesData || []);
    };
    fetchData();
  }, []);

  const generateReport = () => {
    setIsGenerating(true);

    setTimeout(() => {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const filteredRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.date || record.check_in);
        return recordDate >= fromDate && recordDate <= toDate;
      });

      let reportData;

      switch (selectedReport) {
        case "summary":
          reportData = generateSummaryReport(filteredRecords);
          break;
        case "daily":
          reportData = generateDailyReport(filteredRecords);
          break;
        case "employee":
          reportData = generateEmployeeReport(filteredRecords);
          break;
        case "monthly":
          reportData = generateMonthlyReport(filteredRecords);
          break;
        default:
          reportData = generateSummaryReport(filteredRecords);
      }

      setGeneratedReport(reportData);
      setIsGenerating(false);

      toast({
        title: "Report Generated Successfully",
        description: `${reportData.title} has been generated for the selected period`,
      });
    }, 1500);
  };

  const generateSummaryReport = (records) => {
    const totalRecords = records.length;
    const presentRecords = records.filter(r => r.status === 'present').length;
    const absentRecords = records.filter(r => r.status === 'absent').length;
    const lateRecords = records.filter(r => r.status === 'late').length;

    const avgWorkingHours = records
      .filter(r => r.total_hours)
      .reduce((sum, r) => sum + r.total_hours, 0) / (records.filter(r => r.total_hours).length || 1);

    return {
      title: "Executive Summary Report",
      type: "summary",
      data: {
        totalRecords,
        presentRecords,
        absentRecords,
        lateRecords,
        attendanceRate: totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : 0,
        avgWorkingHours: avgWorkingHours.toFixed(2)
      }
    };
  };

  const generateDailyReport = (records: AttendanceRecord[]) => {
    const dailyData: Record<string, {
      present: number;
      absent: number;
      late: number;
      total: number;
    }> = {};

    records.forEach(record => {
      const date = record.date;
      if (!dailyData[date]) {
        dailyData[date] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      dailyData[date][record.status]++;
      dailyData[date].total++;
    });

    return {
      title: "Daily Analytics Report",
      type: "daily",
      data: Object.entries(dailyData).map(([date, stats]) => ({
        date,
        ...stats,
        attendanceRate: ((stats.present / stats.total) * 100).toFixed(1)
      }))
    };
  };

  interface EmployeeReportData {
    name: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    totalWorkingHours: number;
  }


  const generateEmployeeReport = (records: AttendanceRecord[]) => {
    const employeeData: Record<string, EmployeeReportData> = {};

    records.forEach(record => {
      const empId = record.employeeId;
      if (!employeeData[empId]) {
        employeeData[empId] = {
          name: record.employeeName,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
          totalWorkingHours: 0
        };
      }
      employeeData[empId][record.status]++;
      employeeData[empId].total++;
      if (record.workingHours) {
        employeeData[empId].totalWorkingHours += record.workingHours;
      }
    });

    return {
      title: "Employee Performance Report",
      type: "employee",
      data: Object.values(employeeData).map((emp: EmployeeReportData) => ({
        ...emp,
        attendanceRate: ((emp.present / emp.total) * 100).toFixed(1),
        avgWorkingHours: (emp.totalWorkingHours / emp.present || 0).toFixed(2)
      }))
    };
  };

  interface MonthlyStats {
    present: number;
    absent: number;
    late: number;
    total: number;
  }

  const generateMonthlyReport = (records: AttendanceRecord[]) => {
    const monthlyData: Record<string, MonthlyStats> = records.reduce((acc, record) => {
      const month = (record.date || record.check_in).substring(0, 7); // 'YYYY-MM'

      if (!acc[month]) {
        acc[month] = { present: 0, absent: 0, late: 0, total: 0 };
      }

      acc[month][record.status]++;
      acc[month].total++;
      return acc;
    }, {} as Record<string, MonthlyStats>);

    return {
      title: "Monthly Trends Analysis",
      type: "monthly",
      data: Object.entries(monthlyData).map(([month, stats]) => ({
        month,
        ...stats,
        attendanceRate: ((stats.present / stats.total) * 100).toFixed(1)
      }))
    };
  };


  const handleExportReport = async (format) => {
    if (!generatedReport) {
      toast({
        title: "No Report Available",
        description: "Please generate a report before exporting",
        variant: "destructive"
      });
      return;
    }

    if (format === "pdf") {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(generatedReport.title, 14, 20);

      let columns = [];
      let rows = [];

      switch (generatedReport.type) {
        case "daily":
          columns = ["Date", "Present", "Absent", "Late", "Total", "Rate"];
          rows = generatedReport.data.map(row => [
            new Date(row.date).toLocaleDateString(),
            row.present,
            row.absent,
            row.late,
            row.total,
            `${row.attendanceRate}%`
          ]);
          break;

        case "summary":
          columns = ["Metric", "Value"];
          const d = generatedReport.data;
          rows = [
            ["Total Records", d.totalRecords],
            ["Present", d.presentRecords],
            ["Absent", d.absentRecords],
            ["Late", d.lateRecords],
            ["Attendance Rate", `${d.attendanceRate}%`],
            ["Avg Working Hours", `${d.avgWorkingHours} hrs`],
          ];
          break;

        case "employee":
          columns = ["Name", "Present", "Absent", "Late", "Total", "Avg Hrs", "Rate"];
          rows = generatedReport.data.map(emp => [
            emp.name,
            emp.present,
            emp.absent,
            emp.late,
            emp.total,
            emp.avgWorkingHours,
            `${emp.attendanceRate}%`
          ]);
          break;

        case "monthly":
          columns = ["Month", "Present", "Absent", "Late", "Total", "Rate"];
          rows = generatedReport.data.map(row => [
            row.month,
            row.present,
            row.absent,
            row.late,
            row.total,
            `${row.attendanceRate}%`
          ]);
          break;

        default:
          toast({ title: "Unsupported report", variant: "destructive" });
          return;
      }

      autoTable(doc, {
        startY: 30,
        head: [columns],
        body: rows,
        styles: { fontSize: 10 },
      });

      doc.save(`${generatedReport.title.replace(/\s+/g, "_")}.pdf`);
    }
  };


  const reportTypes = [
    {
      id: "summary",
      title: "Executive Summary",
      description: "High-level attendance overview with key metrics",
      icon: PieChart,
      gradient: "from-blue-500 to-blue-600"
    },
    {
      id: "daily",
      title: "Daily Analytics",
      description: "Detailed day-by-day attendance tracking",
      icon: Calendar,
      gradient: "from-green-500 to-green-600"
    },
    {
      id: "employee",
      title: "Employee Performance",
      description: "Individual attendance records and statistics",
      icon: Users,
      gradient: "from-purple-500 to-purple-600"
    },
    {
      id: "monthly",
      title: "Monthly Trends",
      description: "Long-term patterns and monthly comparisons",
      icon: TrendingUp,
      gradient: "from-orange-500 to-orange-600"
    }
  ];

  const renderReportContent = () => {
    if (!generatedReport) {
      return (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex items-center justify-center h-80">
            <div className="text-center">
              <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <FileText className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate Report</h3>
              <p className="text-gray-600 max-w-md">
                Select your preferred report type and date range, then click "Generate Report" to create detailed analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    switch (generatedReport.type) {
      case "summary":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <PieChart className="h-6 w-6 text-blue-600" />
                <span>{generatedReport.title}</span>
              </CardTitle>
              <CardDescription>Comprehensive attendance overview for the selected period</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                  </div>
                  <p className="text-3xl font-bold text-green-700 mb-1">{generatedReport.data.presentRecords}</p>
                  <p className="text-green-600 font-medium">Present Days</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                    <Badge variant="destructive">Attention</Badge>
                  </div>
                  <p className="text-3xl font-bold text-red-700 mb-1">{generatedReport.data.absentRecords}</p>
                  <p className="text-red-600 font-medium">Absent Days</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                    <Badge className="bg-orange-100 text-orange-800">Monitor</Badge>
                  </div>
                  <p className="text-3xl font-bold text-orange-700 mb-1">{generatedReport.data.lateRecords}</p>
                  <p className="text-orange-600 font-medium">Late Arrivals</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{generatedReport.data.attendanceRate}%</p>
                      <p className="text-blue-600 font-medium">Attendance Rate</p>
                    </div>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${generatedReport.data.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-700">{generatedReport.data.avgWorkingHours}h</p>
                      <p className="text-purple-600 font-medium">Avg Working Hours</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <FileText className="h-8 w-8 text-gray-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-700">{generatedReport.data.totalRecords}</p>
                      <p className="text-gray-600 font-medium">Total Records</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "daily":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Calendar className="h-6 w-6 text-green-600" />
                <span>{generatedReport.title}</span>
              </CardTitle>
              <CardDescription>Day-by-day attendance breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-center">Present</TableHead>
                      <TableHead className="font-semibold text-center">Absent</TableHead>
                      <TableHead className="font-semibold text-center">Late</TableHead>
                      <TableHead className="font-semibold text-center">Total</TableHead>
                      <TableHead className="font-semibold text-center">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReport.data.map((day: any, index: number) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {day.present}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {day.absent}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {day.late}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{day.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={parseFloat(day.attendanceRate) >= 90 ? "default" : "secondary"}>
                            {day.attendanceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case "employee":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 border-b">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Users className="h-6 w-6 text-purple-600" />
                <span>{generatedReport.title}</span>
              </CardTitle>
              <CardDescription>Individual employee performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee Name</TableHead>
                      <TableHead className="font-semibold text-center">Present</TableHead>
                      <TableHead className="font-semibold text-center">Absent</TableHead>
                      <TableHead className="font-semibold text-center">Late</TableHead>
                      <TableHead className="font-semibold text-center">Rate</TableHead>
                      <TableHead className="font-semibold text-center">Avg Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReport.data.map((emp: any, index: number) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {emp.present}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {emp.absent}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {emp.late}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={parseFloat(emp.attendanceRate) >= 90 ? "default" : "secondary"}>
                            {emp.attendanceRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{emp.avgWorkingHours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case "monthly":
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <TrendingUp className="h-6 w-6 text-orange-600" />
                <span>{generatedReport.title}</span>
              </CardTitle>
              <CardDescription>Monthly attendance patterns and trends</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Month</TableHead>
                      <TableHead className="font-semibold text-center">Present</TableHead>
                      <TableHead className="font-semibold text-center">Absent</TableHead>
                      <TableHead className="font-semibold text-center">Late</TableHead>
                      <TableHead className="font-semibold text-center">Total</TableHead>
                      <TableHead className="font-semibold text-center">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedReport.data.map((month: any, index: number) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {new Date(month.month + '-01').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {month.present}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            {month.absent}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            {month.late}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">{month.total}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={parseFloat(month.attendanceRate) >= 90 ? "default" : "secondary"}>
                            {month.attendanceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>

            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
                <p className="text-sm text-gray-600">Advanced analytics & insights</p>
              </div>
            </div>

            <div className="flex space-x-3">
              {generatedReport && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleExportReport("excel")}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Excel</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExportReport("pdf")}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>PDF</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Report Configuration Panel */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
            <CardTitle className="flex items-center space-x-3">
              <Filter className="h-5 w-5 text-gray-700" />
              <span>Report Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure your report parameters and generate professional analytics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm font-medium">Start Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm font-medium">End Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Report Type</Label>
                <select
                  value={selectedReport}
                  onChange={(e) => setSelectedReport(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {reportTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Generate</Label>
                <Button
                  onClick={generateReport}
                  disabled={!dateFrom || !dateTo || isGenerating}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                >
                  {isGenerating ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Generate Report</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Types Grid */}
        {!generatedReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => (
              <Card
                key={report.id}
                className={`cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-xl ${selectedReport === report.id
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:shadow-xl'
                  }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${report.gradient}`}>
                      <report.icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 text-gray-900">{report.title}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{report.description}</p>
                      {selectedReport === report.id && (
                        <Badge className="mt-3 bg-blue-100 text-blue-800">Currently Selected</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generated Report Display */}
        {renderReportContent()}
      </div>
    </div>
  );
};

export default Reports;
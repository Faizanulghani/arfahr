import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Shield,
  LogOut,
  UserCheck,
  UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/contexts/LaravelAdminContext";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabase } from "@/lib/supabase";
import useLogout from "@/api/useLogout";
import AddUserModal from "@/components/AddUserModal";
import i18n from "@/i18n/index";
import { t } from "i18next";

interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  date_of_birth: string;
  hire_date: string;
  department: string;
  position: string;
  employee_id: string;
  salary: string | number;
  emergency_contact: string;
  emergency_phone: string;
}

interface User {
  id: string;
  email: string;
  username: string;
  role: "admin" | "employee" | "manager";
  is_active: boolean;
  profile: UserProfile;
}

const UsersManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const logout = useLogout();
  const [lang, setLang] = useState(i18n.language || "en");
  const [authReady, setAuthReady] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng); // this switches language at runtime
    setLang(lng);
    localStorage.setItem("lang", lng);
  };
  // Authentication guard
  // useEffect(() => {
  //   if (!user) {
  //     navigate("/login");
  //   }
  // }, [user, navigate]);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      // not logged in
      if (error || !data?.user) {
        navigate("/login");
        return;
      }

      setAuthReady(true);
    };

    initAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/login");
      else setAuthReady(true);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!authReady) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  // ✅ Fetch from backend API
  const fetchUsers = async () => {
    setLoading(true);
    const { data: authData, error } =
      await supabaseAdmin.auth.admin.listUsers();
    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    console.log("Fetched users from Auth:", authData);
    if (authData?.users) {
      const formatted = authData.users.map((u: any) => {
        const meta = u.user_metadata || {};

        const firstName = meta.first_name || meta.name?.split(" ")[0] || "";
        const lastName = meta.last_name || meta.name?.split(" ")[1] || "";

        return {
          id: u.id,
          email: u.email,
          username: meta.name || `${firstName} ${lastName}`,
          role: meta.role || "employee",
          is_active: meta.status === "active" || u.email_confirmed_at !== null,
          profile: {
            first_name: firstName,
            last_name: lastName,
            phone: meta.phone || "",
            address: meta.address || "",
            department: meta.department || "",
            position: meta.position || "",
            salary: meta.salary || "0",
            emergency_contact: meta.emergency_contact || "",
            emergency_phone: meta.emergency_phone || "",
            employee_id: meta.employee_id || `EMP-${u.id.slice(0, 4)}`,
            hire_date: meta.joining_date || u.created_at,
          },
        };
      });

      setUsers(formatted);
    }
  };

  if (loading) return <p>Loading users...</p>;

  const roles = ["all", "admin", "hr", "employee", "manager"];
  const statuses = ["all", "active", "inactive"];

  const filteredUsers = users.filter((userItem) => {
    const matchesSearch =
      (userItem.username?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (userItem.email?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (userItem.profile?.first_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (userItem.profile?.last_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (userItem.profile?.employee_id?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );

    const matchesRole = filterRole === "all" || userItem.role === filterRole;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && userItem.is_active) ||
      (filterStatus === "inactive" && !userItem.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) return <p>Loading users...</p>;

  const handleDeleteUser = async (id: string, name: string) => {
    if (
      window.confirm(
        t("usersManagement:usersManagement.confirmDelete", { name })
      )
    ) {
      try {
        // 1️⃣ Delete from Auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          id
        );
        if (authError) throw authError;

        // 2️⃣ Delete from Employees
        const { error: empError } = await supabase
          .from("employees")
          .delete()
          .eq("id", id);
        if (empError) throw empError;

        // 3️⃣ Remove locally
        setUsers((prev) => prev.filter((u) => u.id !== id));

        toast({
          title: "User Deleted",
          description: `${name} has been removed from the system`,
        });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);

    setShowModal(true);
  };

  const handleToggleStatus = async (
    id: string,
    name: string,
    currentStatus: boolean
  ) => {
    const newStatus = !currentStatus;

    if (
      window.confirm(
        `Are you sure you want to ${
          newStatus ? "activate" : "deactivate"
        } ${name}?`
      )
    ) {
      try {
        // 🔹 Update status in Supabase Auth user_metadata
        const { error: authError } =
          await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: {
              status: newStatus ? "active" : "inactive",
            },
          });

        if (authError) throw authError;

        // 🔹 Update local state
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  is_active: newStatus,
                  status: newStatus ? "active" : "inactive",
                }
              : u
          )
        );

        toast({
          title: `User ${newStatus ? "Activated" : "Deactivated"}`,
          description: `${name} has been ${
            newStatus ? "activated" : "deactivated"
          } successfully.`,
        });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout(); // wait until logout is complete

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "Something went wrong during logout.",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "hr":
        return "bg-blue-100 text-blue-800";
      case "manager":
        return "bg-purple-100 text-purple-800";
      case "employee":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
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
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {t("usersManagement:usersManagement.title")}
                </h1>
                <p className="text-sm text-gray-600">
                  {t("usersManagement:usersManagement.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <select
                  value={lang}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="border rounded px-2 py-1 bg-white"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                {t("usersManagement:usersManagement.dashboard")}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>{t("usersManagement:usersManagement.logout")}</span>
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
                placeholder={t(
                  "usersManagement:usersManagement.searchPlaceholder"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role === "all"
                    ? "All Roles"
                    : role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? "All Status"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {t("usersManagement:usersManagement.addUser")}
            </Button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>

              <AddUserModal
                open={showModal}
                onClose={() => {
                  setShowModal(false);
                  setSelectedUser(null);
                }}
                selectedUser={selectedUser}
                onUserAdded={(newUser: any) => {
                  fetchUsers();
                  setShowModal(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("usersManagement:usersManagement.totalUsers")}
                  </p>
                  <p className="text-3xl font-bold">{users.length}</p>
                </div>
                <Users className="h-12 w-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("usersManagement:usersManagement.activeUsers")}
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {users.filter((u) => u.is_active).length}
                  </p>
                </div>
                <UserCheck className="h-12 w-12 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("usersManagement:usersManagement.admins")}
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {users.filter((u) => u.role === "admin").length}
                  </p>
                </div>
                <Shield className="h-12 w-12 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("usersManagement:usersManagement.inactive")}
                  </p>
                  <p className="text-3xl font-bold text-orange-600">
                    {users.filter((u) => !u.is_active).length}
                  </p>
                </div>
                <UserX className="h-12 w-12 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>{t("usersManagement:usersManagement.systemUsers")}</span>
            </CardTitle>
            <CardDescription>
              {t("usersManagement:usersManagement.showingUsers", {
                filtered: filteredUsers.length,
                total: users.length,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t("usersManagement:usersManagement.employee")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.contact")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.role")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.userdepartment")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.status")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.hireDate")}
                    </TableHead>
                    <TableHead>
                      {t("usersManagement:usersManagement.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userItem) => (
                    <TableRow key={userItem.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {userItem.profile.first_name[0]}
                            {userItem.profile.last_name[0]}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {userItem.profile.first_name}
                              {userItem.profile.last_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {userItem.profile.employee_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{userItem.email}</p>
                          <p className="text-sm text-gray-500">
                            {userItem.profile.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(userItem.role)}>
                          {userItem.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {userItem.profile.department}
                          </p>
                          <p className="text-sm text-gray-500">
                            {userItem.profile.position}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={userItem.is_active ? "default" : "secondary"}
                        >
                          {userItem.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          userItem.profile.hire_date
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(userItem);
                              setShowViewModal(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(userItem)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleToggleStatus(
                                userItem.id,
                                `${userItem.profile.first_name} ${userItem.profile.last_name}`,
                                userItem.is_active
                              )
                            }
                            className={
                              userItem.is_active
                                ? "text-orange-600 hover:text-orange-700"
                                : "text-green-600 hover:text-green-700"
                            }
                          >
                            {userItem.is_active ? (
                              <UserX className="h-4 w-4" />
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteUser(
                                userItem.id,
                                `${userItem.profile.first_name} ${userItem.profile.last_name}`
                              )
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {showViewModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 relative">
              <button
                onClick={() => setShowViewModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">
                {t("usersManagement:usersManagement.userDetails")}
              </h2>

              <div className="space-y-2 text-sm">
                <p>
                  <strong>{t("usersManagement:usersManagement.name")}</strong>
                  {selectedUser.profile.first_name}
                  {selectedUser.profile.last_name}
                </p>
                <p>
                  <strong>{t("usersManagement:usersManagement.email")}</strong>
                  {selectedUser.email}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.employeeId")}
                  </strong>
                  {selectedUser.profile.employee_id}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.department")}
                  </strong>
                  {selectedUser.profile.department || "—"}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.position")}
                  </strong>
                  {selectedUser.profile.position || "—"}
                </p>
                <p>
                  <strong>{t("usersManagement:usersManagement.salary")}</strong>
                  {selectedUser.profile.salary || "—"}
                </p>
                <p>
                  <strong>{t("usersManagement:usersManagement.phone")}</strong>
                  {selectedUser.profile.phone || "—"}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.emergencyContact")}
                  </strong>
                  {selectedUser.profile.emergency_contact || "—"}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.emergencyPhone")}
                  </strong>
                  {selectedUser.profile.emergency_phone || "—"}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.address")}
                  </strong>
                  {selectedUser.profile.address || "—"}
                </p>
                <p>
                  <strong>
                    {t("usersManagement:usersManagement.hireDate")}
                  </strong>
                  {new Date(
                    selectedUser.profile.hire_date
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>{t("usersManagement:usersManagement.role")}</strong>
                  {selectedUser.role}
                </p>
                <p>
                  <strong>{t("usersManagement:usersManagement.status")}</strong>
                  <span
                    className={
                      selectedUser.is_active ? "text-green-600" : "text-red-600"
                    }
                  >
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersManagement;

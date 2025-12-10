// src/pages/Settings.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  Clock,
  Shield,
  Database,
  Fingerprint,
  LogOut,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SystemSettings = {
  id: string;
  company_name: string;
  working_hours: number;
  break_time: number;
  late_threshold: number;
  notifications: boolean;
  biometric_auth: boolean;
  auto_backup: boolean;
  email_reports: boolean;
  sms_notifications: boolean;
};

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // 🔒 Check auth before showing page
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [navigate]);

  // 📡 Fetch settings from Supabase
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error && error.code === "PGRST116") {
        // if row not found, insert default one
        const { data: inserted } = await supabase
          .from("system_settings")
          .insert([
            {
              id: "default",
              company_name: "AfraExpress",
              working_hours: 9,
              break_time: 1,
              late_threshold: 15,
              notifications: true,
              biometric_auth: false,
              auto_backup: true,
              email_reports: true,
              sms_notifications: false,
            },
          ])
          .select()
          .single();
        setSettings(inserted);
      } else if (data) {
        setSettings(data);
      }
    };

    fetchSettings();
  }, []);

  // 🔄 Live updates via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel("system_settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings" },
        (payload) => {
          if (payload.new && payload.new.id === "default") {
            setSettings(payload.new as SystemSettings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 💾 Save settings
  const handleSaveSettings = async () => {
    if (!settings) return;

    const { error } = await supabase
      .from("system_settings")
      .update({
        company_name: settings.company_name,
        working_hours: settings.working_hours,
        break_time: settings.break_time,
        late_threshold: settings.late_threshold,
        notifications: settings.notifications,
        biometric_auth: settings.biometric_auth,
        auto_backup: settings.auto_backup,
        email_reports: settings.email_reports,
        sms_notifications: settings.sms_notifications,
      })
      .eq("id", "default");

    if (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
    navigate("/login");
  };

  if (loading || !settings) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading Settings…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Fingerprint className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  System Settings
                </h1>
                <p className="text-sm text-gray-600">Configure your attendance system</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
              <CardDescription>Basic system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="workingHours">Working Hours (per day)</Label>
                <Input
                  id="workingHours"
                  type="number"
                  value={settings.working_hours}
                  onChange={(e) => setSettings({ ...settings, working_hours: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="breakTime">Break Time (hours)</Label>
                <Input
                  id="breakTime"
                  type="number"
                  value={settings.break_time}
                  onChange={(e) => setSettings({ ...settings, break_time: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="lateThreshold">Late Threshold (minutes)</Label>
                <Input
                  id="lateThreshold"
                  type="number"
                  value={settings.late_threshold}
                  onChange={(e) => setSettings({ ...settings, late_threshold: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure alert preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-gray-600">Receive real-time alerts</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Reports</Label>
                  <p className="text-sm text-gray-600">Daily attendance reports</p>
                </div>
                <Switch
                  checked={settings.email_reports}
                  onCheckedChange={(checked) => setSettings({ ...settings, email_reports: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-gray-600">Text message alerts</p>
                </div>
                <Switch
                  checked={settings.sms_notifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, sms_notifications: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>Authentication and security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Biometric Authentication</Label>
                  <p className="text-sm text-gray-600">Enable fingerprint login</p>
                </div>
                <Switch
                  checked={settings.biometric_auth}
                  onCheckedChange={(checked) => setSettings({ ...settings, biometric_auth: checked })}
                />
              </div>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  Change Admin Password
                </Button>
                <Button className="w-full" variant="outline">
                  Two-Factor Authentication
                </Button>
                <Button className="w-full" variant="outline">
                  Security Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Settings</span>
              </CardTitle>
              <CardDescription>Data and backup configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Backup</Label>
                  <p className="text-sm text-gray-600">Daily system backup</p>
                </div>
                <Switch
                  checked={settings.auto_backup}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_backup: checked })}
                />
              </div>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  <Database className="h-4 w-4 mr-2" />
                  Export Data
                </Button>
                <Button className="w-full" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  System Logs
                </Button>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Reset System
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleSaveSettings}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

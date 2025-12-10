import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export default function AddUserModal({ open, onClose, onUserAdded }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "employee",
    department: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);

    // ✅ Normal signup (same as your Signup form)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: form.role,
          department: form.department,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("User added successfully!");
      if (onUserAdded) onUserAdded(data.user); // signup returns single user
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            placeholder="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          <Input
            placeholder="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
          />
          <Input
            type="password"
            placeholder="Password"
            name="password"
            value={form.password}
            onChange={handleChange}
          />
          <Select
            value={form.role}
            onValueChange={(val) => setForm({ ...form, role: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Department"
            name="department"
            value={form.department}
            onChange={handleChange}
          />
          <Button onClick={handleSubmit}>
            {loading ? "Adding..." : "Add User"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

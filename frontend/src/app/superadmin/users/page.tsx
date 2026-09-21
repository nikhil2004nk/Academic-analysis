"use client";

import { useAuth, User } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { userService } from "@/services/userService";

export default function UserManagement() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "admin" });
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await userService.createUser(newUser);
      setNewUser({ name: "", email: "", role: "admin" });
      fetchUsers();
      setIsModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(', '));
      } else {
        setError(msg || "Failed to create user");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await userService.deleteUser(id);
        fetchUsers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-white text-glow">User Management</h1>
            <Button onClick={() => setIsModalOpen(true)} className="h-10">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </div>
          
          <div className="rounded-2xl glass shadow-xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Loading users...</TableCell></TableRow>
                ) : users.map((u: any) => (
                  <TableRow key={u.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground group-hover:text-white/80 transition-colors">{u.email}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold",
                        u.role === 'superadmin' ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/10 text-white/80 border border-white/10"
                      )}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full", u.isActive ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" : "bg-gray-500")} />
                        {u.isActive ? (
                          <span className="text-green-400">Online Now</span>
                        ) : (
                          u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} disabled={u.id === user?.id} className="hover:bg-destructive/20 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Add New User"
          >
            <form onSubmit={handleCreateUser} className="space-y-5 py-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Name</label>
                <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Email</label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/90">Role</label>
                <Select 
                  options={[
                    { label: 'Admin', value: 'admin' },
                    { label: 'Superadmin', value: 'superadmin' }
                  ]}
                  value={newUser.role}
                  onChange={(val) => setNewUser({...newUser, role: val})}
                />
              </div>
              {error && <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</div>}
              
              <div className="pt-4 flex items-center justify-between border-t border-white/10">
                <p className="text-xs text-muted-foreground">Password defaults to Firstname@123</p>
                <div className="space-x-3">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="h-10 px-6">
                    <Plus className="mr-2 h-4 w-4" /> Create
                  </Button>
                </div>
              </div>
            </form>
          </Modal>
    </>
  );
}

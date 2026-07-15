import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Trash2, ShieldCheck, Search } from "lucide-react";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";
import api from "../services/api";

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const dispatch = useDispatch();

  const load = () => api.get("/admin/users").then(({ data }) => setUsers(data.users));
  useEffect(() => { load(); }, []);

  const toggleRole = async (u) => {
    const role = u.role === "admin" ? "user" : "admin";
    await api.put(`/admin/users/${u._id}`, { role });
    dispatch(showToast({ type: "success", message: `${u.name} is now ${role}` }));
    load();
  };

  const toggleActive = async (u) => {
    await api.put(`/admin/users/${u._id}`, { isActive: !u.isActive });
    load();
  };

  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${u._id}`);
    dispatch(showToast({ type: "success", message: "User deleted" }));
    load();
  };

  if (!users) return <FullPageLoader label="Loading users" />;

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Users</h1>
      <p className="text-mute mb-8">Manage roles and account status.</p>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full bg-panel2 border border-line rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-mint"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-panel2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mute border-b border-line">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Wallet</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <motion.tr key={u._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-line/50 last:border-0">
                <td className="py-3 pr-4">{u.name}</td>
                <td className="py-3 pr-4 text-mute">{u.email}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(u.walletBalance)}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === "admin" ? "bg-gold/10 text-gold" : "bg-panel2 text-mute"}`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <button
                    onClick={() => toggleActive(u)}
                    className={`px-2 py-0.5 rounded text-xs ${u.isActive ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"}`}
                  >
                    {u.isActive ? "Active" : "Suspended"}
                  </button>
                </td>
                <td className="py-3 flex gap-3">
                  <button onClick={() => toggleRole(u)} title="Toggle admin" className="text-mute hover:text-gold">
                    <ShieldCheck size={16} />
                  </button>
                  <button onClick={() => remove(u)} title="Delete user" className="text-mute hover:text-rose">
                    <Trash2 size={16} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

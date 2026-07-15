import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Landmark, ScrollText } from "lucide-react";
import Navbar from "../components/Navbar";
import Toast from "../components/Toast";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/stocks", label: "Stocks", icon: Landmark },
  { to: "/admin/logs", label: "Activity Logs", icon: ScrollText },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-5 py-8 grid md:grid-cols-[220px_1fr] gap-8">
        <aside className="card h-fit sticky top-24 flex md:flex-col gap-2">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-gold/10 text-gold" : "text-mute hover:text-ice"
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
      <Toast />
    </div>
  );
}

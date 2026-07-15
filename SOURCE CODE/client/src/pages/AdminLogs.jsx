import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { formatDateTime } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";
import api from "../services/api";

const actionTone = (action) => {
  if (action.startsWith("CREATE")) return "bg-mint/10 text-mint";
  if (action.startsWith("UPDATE")) return "bg-amber/10 text-amber";
  if (action.startsWith("DELETE")) return "bg-rose/10 text-rose";
  return "bg-panel2 text-mute";
};

export default function AdminLogs() {
  const [logs, setLogs] = useState(null);

  useEffect(() => {
    api.get("/admin/logs").then(({ data }) => setLogs(data.logs));
  }, []);

  if (!logs) return <FullPageLoader label="Loading activity logs" />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="text-gold" size={22} />
        <h1 className="font-display text-3xl font-bold">Activity logs</h1>
      </div>
      <p className="text-mute mb-8">Recent admin actions across the platform.</p>

      {logs.length === 0 ? (
        <div className="card text-center py-16 text-mute">No admin activity recorded yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mute border-b border-line">
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Entity</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <motion.tr key={log._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-line/50 last:border-0">
                  <td className="py-3 pr-4">{log.adminId?.name || "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionTone(log.action)}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-mute">{log.entityType || "—"}</td>
                  <td className="py-3 text-mute">{formatDateTime(log.createdAt)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

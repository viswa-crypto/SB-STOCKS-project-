import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Bell } from "lucide-react";
import { clearToast } from "../redux/slices/uiSlice";

function ToastItem({ toast }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const t = setTimeout(() => dispatch(clearToast(toast.id)), 5000);
    return () => clearTimeout(t);
  }, [toast.id, dispatch]);

  const Icon = toast.type === "error" ? XCircle : toast.type === "alert" ? Bell : CheckCircle2;
  const color = toast.type === "error" ? "text-rose" : toast.type === "alert" ? "text-gold" : "text-mint";
  const border = toast.type === "error" ? "border-l-rose" : toast.type === "alert" ? "border-l-gold" : "border-l-mint";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`card flex items-start gap-3 min-w-[280px] max-w-sm border-l-4 ${border} cursor-pointer`}
      onClick={() => dispatch(clearToast(toast.id))}
    >
      <Icon className={`${color} shrink-0 mt-0.5`} size={20} />
      <div className="min-w-0">
        {toast.title && <p className="text-sm font-semibold text-ice">{toast.title}</p>}
        <p className="text-sm text-ice/90">{toast.message}</p>
      </div>
    </motion.div>
  );
}

// Stacks every active toast — each notification pops out on its own instead
// of overwriting a single shared slot, so a burst of alerts is never lost.
export default function Toast() {
  const toasts = useSelector((s) => s.ui.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col-reverse gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

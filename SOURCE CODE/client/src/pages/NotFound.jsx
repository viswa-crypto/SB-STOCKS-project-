import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <motion.h1
        initial={{ opacity: 0, scale: 0.7, rotateX: 40 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="font-display text-8xl font-bold text-mint mb-2"
        style={{ perspective: 800 }}
      >
        404
      </motion.h1>
      <p className="text-mute mb-8 max-w-sm">
        This ticker doesn't exist. The page you're looking for has delisted itself.
      </p>
      <Link to="/" className="btn-primary"><Home size={16} /> Back to safety</Link>
    </div>
  );
}

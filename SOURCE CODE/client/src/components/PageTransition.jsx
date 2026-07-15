import { motion } from "framer-motion";

// 3D-feeling page transition: a slight rotateX + depth translate + fade,
// applied around each route's content in AppRoutes.
const variants = {
  initial: { opacity: 0, rotateX: 8, y: 28, scale: 0.98 },
  animate: { opacity: 1, rotateX: 0, y: 0, scale: 1 },
  exit: { opacity: 0, rotateX: -6, y: -18, scale: 0.99 },
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}

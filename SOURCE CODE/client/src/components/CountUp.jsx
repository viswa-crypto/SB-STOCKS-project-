import { useEffect, useRef, useState } from "react";
import { useInView, animate } from "framer-motion";

// Dependency-free count-up: animates a number in when it scrolls into view
export default function CountUp({ end, prefix = "", suffix = "", decimals = 0, duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, end, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, end, duration]);

  return (
    <span ref={ref} className="mono-num">
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}

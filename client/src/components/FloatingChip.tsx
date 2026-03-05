import { motion, useReducedMotion } from "framer-motion";

interface FloatingChipProps {
  children: React.ReactNode;
  /** Vertical float distance in px (default 10) */
  distance?: number;
  /** Animation cycle duration in seconds (default 4) */
  duration?: number;
  /** Stagger delay offset in seconds (default 0) */
  delay?: number;
  className?: string;
}

export function FloatingChip({
  children,
  distance = 10,
  duration = 4,
  delay = 0,
  className = "",
}: FloatingChipProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{ y: [0, -distance, 0] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

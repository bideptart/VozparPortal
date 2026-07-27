import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function TimelineContent({
  as: Tag = "div",
  animationNum = 1,
  customVariants,
  className,
  children,
  ...props
}) {
  const defaultVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.33, 1, 0.68, 1],
      },
    },
  };

  const variants = customVariants || defaultVariants;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: animationNum * 0.1 }}
      variants={variants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

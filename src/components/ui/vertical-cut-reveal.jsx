import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function VerticalCutReveal({
  text,
  className,
  duration = 0.5,
  staggerChildren = 0.1,
  delay = 0,
  as: Tag = "p",
  splitBy = "words",
  textAlign = "left",
  containerClassName,
  once = true,
  ...props
}) {
  const [hasAnimated, setHasAnimated] = useState(false);

  const animatedWords = useMemo(() => {
    if (!text) return [];
    if (splitBy === "words") {
      return text.split(" ").map((word, i) => ({
        word,
        id: i,
      }));
    }

    return text.split("").map((char, i) => ({
        word: char,
        id: i,
      }));
  }, [text, splitBy]);

  return (
    <AnimatePresence mode="wait">
      <Tag
        className={cn(
          "relative overflow-hidden inline-block w-full",
          className
        )}
        {...props}
      >
        <span className="sr-only">{text}</span>
        <motion.span
          aria-hidden
          initial="hidden"
          animate={hasAnimated ? "visible" : "hidden"}
          onViewportEnter={() => {
            if (!once || !hasAnimated) {
              setHasAnimated(true);
            }
          }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ staggerChildren, delayChildren: delay }}
          className={cn("inline-block", containerClassName)}
          style={{ textAlign }}
        >
          {animatedWords.map((item) => (
            <Word
              key={item.id}
              word={item.word}
              duration={duration}
              splitBy={splitBy}
            />
          ))}
        </motion.span>
      </Tag>
    </AnimatePresence>
  );
}

function Word({ word, duration, splitBy }) {
  return (
    <span className="inline-block overflow-hidden pt-1 pb-0.5">
      <motion.span
        className="inline-block"
        variants={{
          hidden: { y: "100%", opacity: 0 },
          visible: {
            y: 0,
            opacity: 1,
            transition: {
              duration,
              ease: [0.33, 1, 0.68, 1],
            },
          },
        }}
      >
        {word}
        {splitBy === "words" && " "}
      </motion.span>
    </span>
  );
}

import { useEffect } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import PricingPicker from "@/components/ui/pricing-picker";

export default function PricingModal({ open, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/78 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-3 md:p-4">
        <div
          className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(17,27,45,0.98),rgba(11,18,32,0.98))] shadow-[0_28px_90px_-28px_rgba(4,107,210,0.65)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[rgba(11,18,32,0.94)] px-4 py-3.5 backdrop-blur md:px-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                Add plan / number
              </div>
              <div className="mt-1 text-base font-semibold text-[var(--foreground)] md:text-lg">
                Pick a plan that fits your call volume
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--accent)]"
              aria-label="Close pricing modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pb-4 pt-1 md:px-5 md:pb-5">
            <PricingPicker
              title="Choose a plan"
              description="Pick the plan that fits your call volume."
              onPlanSelect={(plan) => {
                onClose();
                navigate(plan.href);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

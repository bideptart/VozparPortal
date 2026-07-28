"use client";
import { useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import TimelineContent from "@/components/ui/timeline-content";
import VerticalCutReveal from "@/components/ui/vertical-cut-reveal";

const inr = (n) => `$${Number(n || 0).toLocaleString("en-US")}`;

const revealVariants = {
  visible: (i) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
  hidden: { filter: "blur(10px)", y: -20, opacity: 0 },
};

function featuresFor(plan) {
  return [
    `${plan.min} included minutes`,
    `$${plan.rate}/min overage rate`,
    `${plan.agents >= 999 ? "Unlimited" : plan.agents} AI agents`,
    "Call forwarding & scheduling",
  ];
}

/**
 * Storefront preview of the reseller's live plan cards — same three plans
 * shown to their customers at signup, driven by real plan data (not
 * hardcoded copy). Each card also carries an "Edit" control; when a plan
 * is being edited, that card's body swaps for the inline edit form so the
 * whole pricing/edit experience lives in one place instead of two.
 */
export default function PricingSectionPreview({
  plans,
  editingId,
  draft,
  setDraft,
  floorFor,
  violatesFloor,
  busy,
  onStartEdit,
  onCancelEdit,
  onSave,
}) {
  const sectionRef = useRef(null);
  if (!plans?.length) return null;

  const featuredIndex = Math.min(1, plans.length - 1);

  return (
    <section className="relative w-full" ref={sectionRef}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)] mb-2">
          <VerticalCutReveal
            as="span"
            text="Start 14 Days Free-Trial"
            splitBy="words"
            once
            className="justify-center"
            containerClassName="justify-center"
          />
        </h2>
        <TimelineContent as="p" animationNum={0} customVariants={revealVariants} className="text-sm text-[var(--body)]">
          This is what customers see at signup — no credit card required.
        </TimelineContent>
      </div>

      <div className="grid gap-4 md:grid-cols-3 items-start">
        {plans.map((p, index) => {
          const featured = index === featuredIndex;
          const isEditing = editingId === p.basePlanId;
          const floor = floorFor?.(p.basePlanId) || { amount: 0, rate: 0 };

          return (
            <TimelineContent key={p.basePlanId} as="div" animationNum={index + 1} customVariants={revealVariants}>
              <Card
                className={`p-0 h-fit rounded-[var(--radius)] ${
                  isEditing
                    ? "border-2 border-[var(--primary)] ring-2 ring-[rgba(4,107,210,0.15)]"
                    : featured
                    ? "border-[rgba(4,107,210,0.35)] bg-[linear-gradient(180deg,rgba(4,107,210,0.14),rgba(4,107,210,0.04))]"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                <CardHeader className={`py-5 rounded-t-[var(--radius)] ${isEditing ? "bg-[var(--muted)]" : featured ? "bg-[rgba(4,107,210,0.12)]" : "bg-[var(--muted)]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{p.label}</h3>
                    {isEditing ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">Editing</span>
                    ) : featured ? (
                      <span className="rounded-full border border-[rgba(4,107,210,0.28)] bg-[var(--glow)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  {!isEditing && (
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-4xl font-semibold text-[var(--foreground)]">{inr(p.amount)}</span>
                      <span className="pb-1 text-sm text-[var(--body)]">/month</span>
                    </div>
                  )}
                </CardHeader>

                {isEditing && draft ? (
                  <CardContent className="pb-6 pt-4 space-y-3">
                    <div>
                      <label className="field-label">Plan label</label>
                      <input
                        className="input text-sm"
                        value={draft.label}
                        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">Retail price ($/mo)</label>
                      <input
                        type="number"
                        min={floor.amount}
                        className="input text-sm"
                        value={draft.amount}
                        onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                      />
                      <div className="text-[11px] text-mute mt-1">Floor: <strong>{inr(floor.amount)}</strong> · what you owe us</div>
                    </div>
                    <div>
                      <label className="field-label">Per-minute rate ($)</label>
                      <input
                        type="number"
                        min={floor.rate}
                        step="0.5"
                        className="input text-sm"
                        value={draft.rate}
                        onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
                      />
                      <div className="text-[11px] text-mute mt-1">Floor: <strong>${floor.rate}/min</strong> · what you owe us</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="field-label">Included min</label>
                        <input
                          type="number"
                          min={0}
                          className="input text-sm"
                          value={draft.min}
                          onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Agents</label>
                        <input
                          type="number"
                          min={0}
                          className="input text-sm"
                          value={draft.agents}
                          onChange={(e) => setDraft({ ...draft, agents: e.target.value })}
                        />
                      </div>
                    </div>

                    {violatesFloor && <div className="text-xs text-red-400">⚠ {violatesFloor}</div>}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button className="btn-ghost text-xs" onClick={onCancelEdit} disabled={busy}>Cancel</button>
                      <button
                        onClick={onSave}
                        disabled={busy || !!violatesFloor}
                        className="px-4 py-1.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        {busy ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pb-6 pt-4">
                    <ul className="mb-5 space-y-2.5">
                      {featuresFor(p).map((feature) => (
                        <li key={feature} className="text-sm text-[var(--body)]">{feature}</li>
                      ))}
                    </ul>
                    <div className="mb-4 text-[11px] text-mute">
                      Platform floor: {inr(floor.amount)} · ${floor.rate}/min — your margin is {inr(p.amount - floor.amount)}/mo.
                    </div>
                    <button
                      type="button"
                      onClick={() => onStartEdit?.(p)}
                      className={`w-full rounded-[var(--radius-sm)] p-3 text-sm font-semibold transition-colors duration-200 ${
                        featured
                          ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                          : "border border-[var(--border)] bg-[var(--muted)] text-[var(--foreground)] hover:border-[rgba(4,107,210,0.35)] hover:bg-[var(--primary)] hover:text-white"
                      }`}
                    >
                      Edit {p.label}
                    </button>
                  </CardContent>
                )}
              </Card>
            </TimelineContent>
          );
        })}
      </div>
    </section>
  );
}

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DAYS_AHEAD_OPTIONS,
  ITEM_STATUS_LABEL,
  daysAheadLabel,
  type ItemStatus,
  type TemplateStep,
} from "@/lib/kitchen/types";
import { uid } from "@/lib/kitchen/store";

export const STATUS_ORDER: ItemStatus[] = [
  "unset",
  "on-hand",
  "make",
  "buy",
  "substitute",
  "optional",
  "attention",
];

export function statusClass(status: ItemStatus) {
  switch (status) {
    case "on-hand":
      return "bg-ok text-ok-foreground border-ok";
    case "attention":
    case "make":
    case "buy":
      return "bg-attention text-attention-foreground border-attention-border";
    case "substitute":
      return "bg-info text-info-foreground border-info";
    case "optional":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-card text-muted-foreground border-border";
  }
}

export function needsAttention(status: ItemStatus) {
  return status === "attention" || status === "make" || status === "buy";
}

export function StatusChips({
  value,
  onChange,
}: {
  value: ItemStatus;
  onChange: (s: ItemStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.filter((s) => s !== "unset").map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? "unset" : s)}
          className={cn(
            "min-h-9 rounded-full border px-3 text-xs transition-colors",
            value === s
              ? statusClass(s)
              : "border-border bg-card text-muted-foreground hover:bg-secondary",
          )}
        >
          {ITEM_STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs whitespace-nowrap",
        statusClass(status),
      )}
    >
      {ITEM_STATUS_LABEL[status]}
    </span>
  );
}

export function ListEditor({
  label,
  values,
  onChange,
  placeholder = "Add an item",
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...values, t]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <ul className="space-y-1.5">
        {values.map((v, i) => (
          <li key={`${v}-${i}`} className="flex items-center gap-2">
            <Input
              value={v}
              onChange={(e) =>
                onChange(values.map((x, j) => (j === i ? e.target.value : x)))
              }
              className="h-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          className="h-11"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" className="h-11" onClick={add}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/* ---------- template steps with days-ahead ---------- */

export function StepEditor({
  label,
  steps,
  onChange,
  placeholder = "Add a step",
}: {
  label: string;
  steps: TemplateStep[];
  onChange: (s: TemplateStep[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...steps, { id: uid(), text: t, daysAhead: 0, keeps: "" }]);
    setDraft("");
  };
  const patch = (i: number, p: Partial<TemplateStep>) =>
    onChange(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.id} className="space-y-2 rounded-xl border border-border bg-card p-2">
            <div className="flex items-center gap-2">
              <Input
                value={s.text}
                aria-label="Step"
                onChange={(e) => patch(i, { text: e.target.value })}
                className="h-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 shrink-0"
                aria-label={`Remove ${s.text}`}
                onClick={() => onChange(steps.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                aria-label="When it can be done"
                value={s.daysAhead}
                onChange={(e) => patch(i, { daysAhead: Number(e.target.value) })}
                className="h-11 min-w-40 rounded-md border border-input bg-background px-3 text-base"
              >
                {DAYS_AHEAD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {daysAheadLabel(n)}
                  </option>
                ))}
              </select>
              <Input
                value={s.keeps ?? ""}
                placeholder="Keeps… (optional, e.g. keeps a week)"
                aria-label="How long it keeps"
                onChange={(e) => patch(i, { keeps: e.target.value })}
                className="h-11 min-w-40 flex-1"
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          className="h-11"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" className="h-11" onClick={add}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}

/** Read-only view of a template's steps, grouped by how far ahead they happen. */
export function StepChain({
  groups,
}: {
  groups: { label: string; steps: TemplateStep[] }[];
}) {
  const all = groups.flatMap((g) => g.steps.map((s) => ({ ...s, group: g.label })));
  if (all.length === 0) return null;
  const days = [...new Set(all.map((s) => s.daysAhead))].sort((a, b) => b - a);
  return (
    <div className="mt-3 space-y-2">
      {days.map((d) => (
        <div key={d}>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {daysAheadLabel(d)}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {all
              .filter((s) => s.daysAhead === d)
              .map((s) => (
                <li key={s.id}>
                  {s.text || "Untitled step"}
                  <span className="text-muted-foreground"> · {s.group}</span>
                  {s.keeps ? (
                    <span className="text-muted-foreground italic"> · {s.keeps}</span>
                  ) : null}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ITEM_STATUS_LABEL, type ItemStatus } from "@/lib/kitchen/types";

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

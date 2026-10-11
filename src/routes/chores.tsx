import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/kitchen/Shell";
import { EmptyNote } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  patchChore,
  removeChore,
  reorderChores,
  saveChore,
  uid,
  useKitchen,
  useToday,
} from "@/lib/kitchen/store";
import {
  CHORE_PHASE_LABEL,
  emptyChoreStep,
  type Chore,
  type ChorePhase,
  type ChoreStep,
} from "@/lib/kitchen/types";

const CHORE_PHASES: ChorePhase[] = ["setup", "prep", "do", "finish"];

export const Route = createFileRoute("/chores")({
  head: () => ({
    meta: [
      { title: "Chores — Kitchen Plan" },
      {
        name: "description",
        content: "Cleaning chores, sorted by how long since each was last done.",
      },
      { property: "og:title", content: "Chores — Kitchen Plan" },
      {
        property: "og:description",
        content: "Cleaning chores, sorted by how long since each was last done.",
      },
    ],
  }),
  component: ChoresPage,
});

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

function sinceText(lastDone: string | undefined, today: string) {
  if (!lastDone) return "Not yet done";
  const n = daysBetween(lastDone, today);
  if (n === 0) return "Today";
  if (n === 1) return "Yesterday";
  if (n < 14) return `${n} days ago`;
  if (n < 60) return `${Math.round(n / 7)} weeks ago`;
  if (n < 365) return `${Math.round(n / 30)} months ago`;
  const y = Math.round(n / 365);
  return y === 1 ? "About a year ago" : `${y} years ago`;
}

const INTERVAL_OPTIONS: { days: number | undefined; label: string }[] = [
  { days: undefined, label: "Not set" },
  { days: 3, label: "Every few days" },
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Monthly" },
  { days: 91, label: "Every 3 months" },
  { days: 182, label: "Every 6 months" },
  { days: 365, label: "Yearly" },
];

/** Neutral fallback for chores with no interval set. */
const FALLBACK_INTERVAL = 30;

function intervalLabel(days: number | undefined) {
  return INTERVAL_OPTIONS.find((o) => o.days === days)?.label;
}

/**
 * Sorting weight: how far through its interval the chore is
 * (days elapsed / interval). Never-done chores sort first.
 * This is a weight only — never a deadline.
 */
function stalenessRatio(c: Chore, today: string) {
  if (!c.lastDone) return Number.POSITIVE_INFINITY;
  return daysBetween(c.lastDone, today) / (c.intervalDays ?? FALLBACK_INTERVAL);
}

/** Highest staleness ratio first; manual order breaks ties. */
function sortChores(chores: Chore[], today: string) {
  return chores
    .map((c, i) => ({ c, i }))
    .sort((x, y) => {
      const ra = stalenessRatio(x.c, today);
      const rb = stalenessRatio(y.c, today);
      if (ra !== rb) return rb - ra;
      return (x.c.order ?? x.i) - (y.c.order ?? y.i);
    })
    .map(({ c }) => c);
}

function ChoresPage() {
  const { data, ready } = useKitchen();
  const today = useToday();
  const [draft, setDraft] = useState("");
  const sorted = sortChores(data.chores, today);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    saveChore({ id: uid(), name, order: data.chores.length });
    setDraft("");
  };

  // Moving only swaps with a neighbour at the same staleness level,
  // since the ratio sort decides everything else.
  const move = (index: number, dir: -1 | 1) => {
    const ids = sorted.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    reorderChores(ids);
  };
  const canSwap = (i: number, j: number) =>
    j >= 0 &&
    j < sorted.length &&
    stalenessRatio(sorted[i]!, today) === stalenessRatio(sorted[j]!, today);

  return (
    <Shell title="Chores" subtitle="What most needs doing sits at the top.">
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            className="h-12"
            placeholder="Add a chore"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button className="h-12" onClick={add}>
            <Plus className="size-4" /> Add
          </Button>
        </div>

        {!ready ? (
          <EmptyNote>Loading…</EmptyNote>
        ) : sorted.length === 0 ? (
          <EmptyNote>No chores yet.</EmptyNote>
        ) : (
          <ul className="grid gap-2">
            {sorted.map((chore, i) => (
              <ChoreRow
                key={chore.id}
                chore={chore}
                since={sinceText(chore.lastDone, today)}
                doneToday={chore.lastDone === today}
                onDone={() => {
                  const prev = chore.lastDone;
                  patchChore(chore.id, { lastDone: today });
                  toast(`${chore.name} marked done`, {
                    action: { label: "Undo", onClick: () => patchChore(chore.id, { lastDone: prev }) },
                  });
                }}
                onUp={canSwap(i, i - 1) ? () => move(i, -1) : undefined}
                onDown={canSwap(i, i + 1) ? () => move(i, 1) : undefined}
              />
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function ChoreRow({
  chore,
  since,
  doneToday,
  onDone,
  onUp,
  onDown,
}: {
  chore: Chore;
  since: string;
  doneToday: boolean;
  onDone: () => void;
  onUp?: (() => void) | undefined;
  onDown?: (() => void) | undefined;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(chore.name);
  const [notes, setNotes] = useState(chore.notes ?? "");
  const [intervalDays, setIntervalDays] = useState<number | undefined>(chore.intervalDays);
  const [steps, setSteps] = useState<ChoreStep[]>(chore.steps ?? []);

  if (editing) {
    return (
      <li className="space-y-2 rounded-xl border border-border bg-card p-3">
        <Input
          className="h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Chore name"
        />
        <Input
          className="h-11"
          value={notes}
          placeholder="Note (optional)"
          onChange={(e) => setNotes(e.target.value)}
          aria-label="Note"
        />
        <select
          className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={intervalDays ?? ""}
          onChange={(e) =>
            setIntervalDays(e.target.value === "" ? undefined : Number(e.target.value))
          }
          aria-label="How often it needs doing"
        >
          {INTERVAL_OPTIONS.map((o) => (
            <option key={o.label} value={o.days ?? ""}>
              Needs doing: {o.label}
            </option>
          ))}
        </select>
        <div className="space-y-2">
          <p className="text-sm font-medium">Steps (optional)</p>
          {steps.map((step, i) => (
            <div key={step.id} className="space-y-1 rounded-lg border border-border p-2">
              <div className="flex gap-2">
                <Input
                  className="h-11"
                  value={step.text}
                  placeholder="Step"
                  onChange={(e) =>
                    setSteps(steps.map((s, j) => (j === i ? { ...s, text: e.target.value } : s)))
                  }
                  aria-label={`Step ${i + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={`Remove step ${i + 1}`}
                  onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <select
                  className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                  value={step.phase ?? "do"}
                  onChange={(e) =>
                    setSteps(
                      steps.map((s, j) =>
                        j === i ? { ...s, phase: e.target.value as ChorePhase } : s,
                      ),
                    )
                  }
                  aria-label={`Step ${i + 1} phase`}
                >
                  {CHORE_PHASES.map((p) => (
                    <option key={p} value={p}>
                      {CHORE_PHASE_LABEL[p]}
                    </option>
                  ))}
                </select>
                <Input
                  className="h-11"
                  value={step.constraint ?? ""}
                  placeholder="Note, e.g. needs stool (optional)"
                  onChange={(e) =>
                    setSteps(
                      steps.map((s, j) =>
                        j === i ? { ...s, constraint: e.target.value || undefined } : s,
                      ),
                    )
                  }
                  aria-label={`Step ${i + 1} note`}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            className="h-11"
            onClick={() => setSteps([...steps, emptyChoreStep()])}
          >
            <Plus className="size-4" /> Add step
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11"
            onClick={() => {
              patchChore(chore.id, {
                name: name.trim() || chore.name,
                notes: notes.trim() || undefined,
                intervalDays,
                steps: steps.filter((s) => s.text.trim()),
              });
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setEditing(false)}>
            Cancel
          </Button>
          <Button
            variant="ghost"
            className="ml-auto h-11"
            onClick={() => {
              if (window.confirm(`Delete "${chore.name}"?`)) removeChore(chore.id);
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <div className="min-w-40 flex-1">
        <p className="font-medium">{chore.name}</p>
        <p className="text-sm text-muted-foreground">
          {since}
          {intervalLabel(chore.intervalDays) && chore.intervalDays !== undefined
            ? ` · ${intervalLabel(chore.intervalDays)}`
            : null}
          {chore.notes ? <span className="italic"> · {chore.notes}</span> : null}
        </p>
        {chore.steps && chore.steps.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {chore.steps.map((s) => (
              <li key={s.id}>
                · {s.text}
                <span className="text-xs">
                  {" "}({CHORE_PHASE_LABEL[s.phase ?? "do"]}
                  {s.constraint ? ` — ${s.constraint}` : ""})
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Move up"
          disabled={!onUp}
          onClick={onUp}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Move down"
          disabled={!onDown}
          onClick={onDown}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={`Edit ${chore.name}`}
          onClick={() => {
            setName(chore.name);
            setNotes(chore.notes ?? "");
            setIntervalDays(chore.intervalDays);
            setSteps(chore.steps ?? []);
            setEditing(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant={doneToday ? "secondary" : "outline"}
          className="h-11"
          disabled={doneToday}
          onClick={onDone}
        >
          <Check className="size-4" /> Done
        </Button>
      </div>
    </li>
  );
}

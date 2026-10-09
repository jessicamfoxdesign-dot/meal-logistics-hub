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
import type { Chore } from "@/lib/kitchen/types";

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

/** Never-done first, then oldest lastDone; manual order breaks ties. */
function sortChores(chores: Chore[]) {
  return chores
    .map((c, i) => ({ c, i }))
    .sort((x, y) => {
      const a = x.c.lastDone ?? "";
      const b = y.c.lastDone ?? "";
      if (a !== b) return a < b ? -1 : 1;
      return (x.c.order ?? x.i) - (y.c.order ?? y.i);
    })
    .map(({ c }) => c);
}

function ChoresPage() {
  const { data, ready } = useKitchen();
  const today = useToday();
  const [draft, setDraft] = useState("");
  const sorted = sortChores(data.chores);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    saveChore({ id: uid(), name, order: data.chores.length });
    setDraft("");
  };

  // Moving only swaps with a neighbour that shares the same "last done",
  // since the staleness sort decides everything else.
  const move = (index: number, dir: -1 | 1) => {
    const ids = sorted.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    reorderChores(ids);
  };
  const canSwap = (i: number, j: number) =>
    j >= 0 && j < sorted.length && (sorted[i]!.lastDone ?? "") === (sorted[j]!.lastDone ?? "");

  return (
    <Shell title="Chores" subtitle="Whatever has gone longest sits at the top.">
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
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11"
            onClick={() => {
              patchChore(chore.id, {
                name: name.trim() || chore.name,
                notes: notes.trim() || undefined,
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
          {chore.notes ? <span className="italic"> · {chore.notes}</span> : null}
        </p>
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

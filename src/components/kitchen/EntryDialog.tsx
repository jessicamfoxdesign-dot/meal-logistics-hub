import { useState } from "react";
import { ArrowRight, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  addDays,
  addNeed,
  deleteEntry,
  formatDay,
  patchEntry,
  patchItem,
  patchTask,
  removeItem,
  removeTask,
  saveEntry,
  toggleTask,
  uid,
} from "@/lib/kitchen/store";
import {
  PHASE_LABEL,
  daysAheadLabel,
  type Phase,
  type PlanEntry,
} from "@/lib/kitchen/types";
import { ListEditor, StatusChips, needsAttention } from "./bits";

const PHASES: Phase[] = ["setup", "prep", "cook"];

function relLabel(day: string, base: string) {
  const [y1, m1, d1] = day.split("-").map(Number);
  const [y2, m2, d2] = base.split("-").map(Number);
  const diff = Math.round(
    (Date.UTC(y2!, m2! - 1, d2!) - Date.UTC(y1!, m1! - 1, d1!)) / 86400000,
  );
  if (diff < 0) return diff === -1 ? "1 day after" : `${-diff} days after`;
  return daysAheadLabel(diff);
}

export function EntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: PlanEntry | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [newItem, setNewItem] = useState("");
  const [newTask, setNewTask] = useState<Record<string, string>>({});

  if (!entry) return null;

  const addItem = () => {
    const label = newItem.trim();
    if (!label) return;
    saveEntry({
      ...entry,
      items: [
        ...entry.items,
        { id: uid(), label, kind: "ingredient", status: "unset", note: "" },
      ],
    });
    setNewItem("");
  };

  const addTask = (phase: Phase) => {
    const text = (newTask[phase] ?? "").trim();
    if (!text) return;
    saveEntry({
      ...entry,
      tasks: [
        ...entry.tasks,
        { id: uid(), text, phase, done: false, notes: "" },
      ],
    });
    setNewTask((s) => ({ ...s, [phase]: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left text-2xl">{entry.title}</DialogTitle>
          <DialogDescription className="text-left">
            {formatDay(entry.date)}
            {entry.skipped ? " · Not today" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="h-11"
              onClick={() =>
                patchEntry(entry.id, { date: addDays(entry.date, -1) })
              }
            >
              Move a day earlier
            </Button>
            <Button
              variant="secondary"
              className="h-11"
              onClick={() =>
                patchEntry(entry.id, { date: addDays(entry.date, 1) })
              }
            >
              Move a day later <ArrowRight className="size-4" />
            </Button>
            <Button
              variant={entry.skipped ? "default" : "outline"}
              className="h-11"
              onClick={() => patchEntry(entry.id, { skipped: !entry.skipped })}
            >
              {entry.skipped ? "Back on the plan" : "Not today"}
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                deleteEntry(entry.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="size-4" /> Remove from plan
            </Button>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg">Preflight</h3>
            <p className="text-sm text-muted-foreground">
              Check what's here while there's still time to change course.
            </p>
            <ul className="space-y-3">
              {entry.items.map((item) => (
                <li
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    needsAttention(item.status)
                      ? "border-attention-border bg-attention/40"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) =>
                        patchItem(entry.id, item.id, { label: e.target.value })
                      }
                      className="h-11 border-transparent bg-transparent px-0 text-base font-medium shadow-none focus-visible:border-input focus-visible:px-3"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label="Remove item"
                      onClick={() => removeItem(entry.id, item.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <StatusChips
                      value={item.status}
                      onChange={(status) =>
                        patchItem(entry.id, item.id, { status })
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Input
                      value={item.note}
                      placeholder="Note"
                      className="h-10 flex-1 min-w-40"
                      onChange={(e) =>
                        patchItem(entry.id, item.id, { note: e.target.value })
                      }
                    />
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() =>
                        addNeed({
                          id: uid(),
                          text: item.label,
                          done: false,
                          sourceEntryId: entry.id,
                          sourceLabel: entry.title,
                        })
                      }
                    >
                      <ShoppingBasket className="size-4" /> To needs list
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={() =>
                        saveEntry({
                          ...entry,
                          tasks: [
                            ...entry.tasks,
                            {
                              id: uid(),
                              text: item.label,
                              phase: "prep",
                              done: false,
                              notes: "",
                            },
                          ],
                        })
                      }
                    >
                      <Plus className="size-4" /> Prep task
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                className="h-11"
                placeholder="Add something to verify"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button variant="secondary" className="h-11" onClick={addItem}>
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </section>

          <Separator />

          {PHASES.map((phase) => (
            <section key={phase} className="space-y-3">
              <h3 className="text-lg">{PHASE_LABEL[phase]}</h3>
              <ul className="space-y-2">
                {entry.tasks
                  .filter((t) => t.phase === phase)
                  .map((t, i) => ({ t, i, day: t.doDate ?? entry.date }))
                  .sort((a, b) => a.day.localeCompare(b.day) || a.i - b.i)
                  .map(({ t: task, day }, idx, arr) => (
                    <li
                      key={task.id}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      {idx === 0 || arr[idx - 1]!.day !== day ? (
                        <p className="-mt-1 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          {relLabel(day, entry.date)} · {formatDay(day)}
                        </p>
                      ) : null}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.done}
                          onCheckedChange={() => toggleTask(entry.id, task.id)}
                          className="mt-2 size-6"
                          aria-label={task.text}
                        />
                        <Input
                          value={task.text}
                          onChange={(e) =>
                            patchTask(entry.id, task.id, {
                              text: e.target.value,
                            })
                          }
                          className={`h-11 border-transparent bg-transparent px-0 text-base shadow-none focus-visible:border-input focus-visible:px-3 ${
                            task.done ? "text-muted-foreground line-through" : ""
                          }`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 shrink-0"
                          aria-label="Remove task"
                          onClick={() => removeTask(entry.id, task.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      {task.keeps ? (
                        <p className="pl-9 text-xs text-muted-foreground italic">
                          {task.keeps}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-9">
                        <Button
                          variant="outline"
                          className="h-11 text-xs"
                          onClick={() =>
                            patchTask(entry.id, task.id, {
                              doDate: addDays(task.doDate ?? entry.date, -1),
                            })
                          }
                        >
                          Do a day earlier
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 text-xs"
                          onClick={() =>
                            patchTask(entry.id, task.id, {
                              doDate: addDays(task.doDate ?? entry.date, 1),
                            })
                          }
                        >
                          Defer a day
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  className="h-11"
                  placeholder={`Add a ${PHASE_LABEL[phase].toLowerCase()} task`}
                  value={newTask[phase] ?? ""}
                  onChange={(e) =>
                    setNewTask((s) => ({ ...s, [phase]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask(phase);
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => addTask(phase)}
                >
                  <Plus className="size-4" /> Add
                </Button>
              </div>
            </section>
          ))}

          <Separator />

          <section className="space-y-2">
            <h3 className="text-lg">Notes</h3>
            <Textarea
              value={entry.notes}
              rows={3}
              placeholder="Anything that doesn't fit elsewhere — including a Plan B."
              onChange={(e) => patchEntry(entry.id, { notes: e.target.value })}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ListEditor };

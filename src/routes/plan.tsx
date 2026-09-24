import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { EntryDialog } from "@/components/kitchen/EntryDialog";
import { EmptyNote, needsAttention } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addDays,
  formatDay,
  patchEntry,
  saveEntry,
  useKitchen,
  useToday,
} from "@/lib/kitchen/store";
import {
  entryFromMeal,
  entryFromMission,
  simpleEntry,
} from "@/lib/kitchen/create";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Plan — Kitchen Plan" },
      {
        name: "description",
        content:
          "A seven-day dinner plan you can rearrange without losing any preparation.",
      },
      { property: "og:title", content: "Plan — Kitchen Plan" },
      {
        property: "og:description",
        content:
          "A seven-day dinner plan you can rearrange without losing any preparation.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { data, ready } = useKitchen();
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addDay, setAddDay] = useState<string | null>(null);

  const start = addDays(today, offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const openEntry = data.entries.find((e) => e.id === openId);

  return (
    <Shell
      title="The week"
      subtitle="Move anything, any time. Nothing you've prepared gets lost."
      action={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Previous week"
            onClick={() => setOffset((o) => o - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Next week"
            onClick={() => setOffset((o) => o + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      {!ready ? (
        <EmptyNote>Loading your plan…</EmptyNote>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {days.map((day) => {
            const entries = data.entries.filter((e) => e.date === day);
            return (
              <section
                key={day}
                className={`rounded-2xl border p-4 ${
                  day === today
                    ? "border-primary/40 bg-card shadow-sm"
                    : "border-border bg-card/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg">
                    {formatDay(day)}
                    {day === today ? (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        Today
                      </span>
                    ) : null}
                  </h2>
                </div>

                <ul className="mt-3 space-y-2">
                  {entries.map((entry) => {
                    const open = entry.items.filter((i) =>
                      needsAttention(i.status),
                    ).length;
                    return (
                      <li
                        key={entry.id}
                        className={`rounded-xl border p-3 ${
                          entry.skipped
                            ? "border-dashed border-border bg-muted/40"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p
                              className={`font-medium ${
                                entry.skipped ? "text-muted-foreground" : ""
                              }`}
                            >
                              {entry.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.kind === "mission" ? "Mission" : "Dinner"}
                              {entry.skipped ? " · not today" : ""}
                              {open > 0 ? ` · ${open} to sort out` : ""}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-10"
                              aria-label="Move a day earlier"
                              onClick={() =>
                                patchEntry(entry.id, {
                                  date: addDays(entry.date, -1),
                                })
                              }
                            >
                              <ChevronLeft className="size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-10"
                              aria-label="Move a day later"
                              onClick={() =>
                                patchEntry(entry.id, {
                                  date: addDays(entry.date, 1),
                                })
                              }
                            >
                              <ChevronRight className="size-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              className="h-10"
                              onClick={() => setOpenId(entry.id)}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <Dialog
                  open={addDay === day}
                  onOpenChange={(v) => setAddDay(v ? day : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="mt-3 h-11 w-full">
                      <Plus className="size-4" /> Add to this day
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-left">
                        Add to {formatDay(day)}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Meals</p>
                        <div className="grid gap-2">
                          {data.meals
                            .filter((m) => !m.archived)
                            .map((meal) => (
                              <Button
                                key={meal.id}
                                variant="outline"
                                className="h-12 justify-start"
                                onClick={() => {
                                  saveEntry(entryFromMeal(meal, day));
                                  setAddDay(null);
                                }}
                              >
                                {meal.name}
                              </Button>
                            ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Missions</p>
                        <div className="grid gap-2">
                          {data.missions
                            .filter((m) => !m.archived)
                            .map((mission) => (
                              <Button
                                key={mission.id}
                                variant="outline"
                                className="h-12 justify-start"
                                onClick={() => {
                                  saveEntry(entryFromMission(mission, day));
                                  setAddDay(null);
                                }}
                              >
                                {mission.name}
                              </Button>
                            ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Other</p>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              ["leftovers", "Leftovers"],
                              ["takeout", "Takeout"],
                              ["open", "Open / unplanned"],
                            ] as const
                          ).map(([kind, label]) => (
                            <Button
                              key={kind}
                              variant="secondary"
                              className="h-11"
                              onClick={() => {
                                saveEntry(simpleEntry(kind, label, day));
                                setAddDay(null);
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </section>
            );
          })}
        </div>
      )}

      <EntryDialog
        entry={openEntry}
        open={!!openEntry}
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </Shell>
  );
}

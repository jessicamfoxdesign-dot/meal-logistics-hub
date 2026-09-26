import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDay,
  saveEntry,
  saveMeal,
  saveMission,
  useKitchen,
} from "@/lib/kitchen/store";
import {
  emptyMeal,
  emptyMission,
  entryFromMeal,
  entryFromMission,
  simpleEntry,
} from "@/lib/kitchen/create";
import type { PlanEntry } from "@/lib/kitchen/types";

type Mode = null | "meal" | "mission" | "other";

const MODE_LABEL: Record<Exclude<Mode, null>, string> = {
  meal: "New meal",
  mission: "New mission",
  other: "One-off entry",
};

/**
 * Add something to a day: pick an existing meal/mission, or create a new
 * meal, mission, or one-off entry by name. Calls onAdded with the new entry id
 * so the caller can open it for filling in items and steps.
 */
export function AddToDayDialog({
  day,
  open,
  onOpenChange,
  onAdded,
}: {
  day: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded?: (entryId: string) => void;
}) {
  const { data } = useKitchen();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");

  const reset = () => {
    setQuery("");
    setMode(null);
    setName("");
  };
  const close = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };
  const finish = (entry: PlanEntry) => {
    saveEntry(entry);
    reset();
    onOpenChange(false);
    onAdded?.(entry.id);
  };

  const create = (kind: Exclude<Mode, null>, raw: string) => {
    const n = raw.trim();
    if (!n) return;
    if (kind === "meal") {
      const meal = { ...emptyMeal(), name: n };
      saveMeal(meal);
      finish(entryFromMeal(meal, day));
    } else if (kind === "mission") {
      const mission = { ...emptyMission(), name: n };
      saveMission(mission);
      finish(entryFromMission(mission, day));
    } else {
      // No linked template: "other" is the existing kind for this.
      finish(simpleEntry("other", n, day));
    }
  };

  const q = query.trim().toLowerCase();
  const meals = data.meals.filter(
    (m) => !m.archived && m.name.toLowerCase().includes(q),
  );
  const missions = data.missions.filter(
    (m) => !m.archived && m.name.toLowerCase().includes(q),
  );
  const noMatches = q.length > 0 && meals.length === 0 && missions.length === 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">Add to {formatDay(day)}</DialogTitle>
        </DialogHeader>

        {mode ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create(mode, name);
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">{MODE_LABEL[mode]} — name</span>
              <Input
                autoFocus
                className="h-12 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === "other" ? "e.g. Soup from the freezer" : "Name"}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              {mode === "other"
                ? "Added to this day only, not saved to your library. You can add items and steps after."
                : "Saved to your library and added to this day. Fill in items and steps whenever you like."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="h-11" disabled={!name.trim()}>
                Add to day
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setMode(null)}>
                Back
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-12 pl-9 text-base"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type a new name"
                aria-label="Search meals and missions"
              />
            </div>

            {noMatches ? (
              <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
                <p className="text-sm text-muted-foreground">Nothing matches “{query.trim()}”.</p>
                <Button
                  variant="outline"
                  className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                  onClick={() => create("meal", query)}
                >
                  <Plus className="size-4 shrink-0" /> Create “{query.trim()}” as a new meal
                </Button>
                <Button
                  variant="outline"
                  className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                  onClick={() => create("mission", query)}
                >
                  <Plus className="size-4 shrink-0" /> Create “{query.trim()}” as a new mission
                </Button>
                <Button
                  variant="ghost"
                  className="h-auto min-h-12 w-full justify-start whitespace-normal text-left"
                  onClick={() => create("other", query)}
                >
                  <Plus className="size-4 shrink-0" /> Add “{query.trim()}” as a one-off
                </Button>
              </div>
            ) : (
              <>
                {meals.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Meals</p>
                    <div className="grid gap-2">
                      {meals.map((meal) => (
                        <Button
                          key={meal.id}
                          variant="outline"
                          className="h-12 justify-start"
                          onClick={() => finish(entryFromMeal(meal, day))}
                        >
                          {meal.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {missions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Missions</p>
                    <div className="grid gap-2">
                      {missions.map((mission) => (
                        <Button
                          key={mission.id}
                          variant="outline"
                          className="h-12 justify-start"
                          onClick={() => finish(entryFromMission(mission, day))}
                        >
                          {mission.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Create new</p>
              <div className="flex flex-wrap gap-2">
                {(["meal", "mission", "other"] as const).map((k) => (
                  <Button
                    key={k}
                    variant="secondary"
                    className="h-11"
                    onClick={() => {
                      setName(query.trim());
                      setMode(k);
                    }}
                  >
                    <Plus className="size-4" /> {MODE_LABEL[k]}
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
                    variant="ghost"
                    className="h-11"
                    onClick={() => finish(simpleEntry(kind, label, day))}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

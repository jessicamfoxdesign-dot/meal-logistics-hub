import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { EmptyNote, ListEditor } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteMeal, saveMeal, uid, useKitchen } from "@/lib/kitchen/store";
import { emptyMeal } from "@/lib/kitchen/create";
import type { Meal } from "@/lib/kitchen/types";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Meals — Kitchen Plan" },
      {
        name: "description",
        content:
          "Your own library of meals with the components, equipment and tasks you already use.",
      },
      { property: "og:title", content: "Meals — Kitchen Plan" },
      {
        property: "og:description",
        content:
          "Your own library of meals with the components, equipment and tasks you already use.",
      },
    ],
  }),
  component: MealsPage,
});

function MealsPage() {
  const { data, ready } = useKitchen();
  const [editing, setEditing] = useState<Meal | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const meals = data.meals.filter((m) => m.archived === showArchived);

  return (
    <Shell
      title="Meals"
      subtitle="Things you already know how to make — kept the way you make them."
      action={
        <Button className="h-11" onClick={() => setEditing(emptyMeal())}>
          <Plus className="size-4" /> New meal
        </Button>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <Switch
          id="archived"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        <Label htmlFor="archived">Show archived</Label>
      </div>

      {!ready ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : meals.length === 0 ? (
        <EmptyNote>Nothing here yet.</EmptyNote>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {meals.map((meal) => (
            <li
              key={meal.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h2 className="text-xl">{meal.name || "Untitled"}</h2>
              {meal.notes ? (
                <p className="mt-1 text-sm text-muted-foreground">{meal.notes}</p>
              ) : null}
              <dl className="mt-3 grid gap-1 text-sm text-muted-foreground">
                <div>{meal.items.length} things to verify</div>
                <div>{meal.prep.length} prep tasks</div>
                <div>{meal.cook.length} cook / finish tasks</div>
                {meal.equipment.length > 0 ? (
                  <div>Equipment: {meal.equipment.join(", ")}</div>
                ) : null}
                {meal.planB ? <div>Plan B: {meal.planB}</div> : null}
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => setEditing({ ...meal })}
                >
                  <Pencil className="size-4" /> Edit
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() =>
                    saveMeal({
                      ...meal,
                      id: uid(),
                      name: `${meal.name} (copy)`,
                      items: meal.items.map((i) => ({ ...i, id: uid() })),
                    })
                  }
                >
                  <Copy className="size-4" /> Duplicate
                </Button>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => saveMeal({ ...meal, archived: !meal.archived })}
                >
                  {meal.archived ? "Unarchive" : "Archive"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground"
                  aria-label="Delete meal"
                  onClick={() => deleteMeal(meal.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MealEditor
        meal={editing}
        onClose={() => setEditing(null)}
        onSave={(m) => {
          saveMeal(m);
          setEditing(null);
        }}
      />
    </Shell>
  );
}

function MealEditor({
  meal,
  onClose,
  onSave,
}: {
  meal: Meal | null;
  onClose: () => void;
  onSave: (m: Meal) => void;
}) {
  const [draft, setDraft] = useState<Meal | null>(meal);
  if (meal && (!draft || draft.id !== meal.id)) setDraft(meal);
  if (!meal || !draft) return null;

  const set = (patch: Partial<Meal>) => setDraft({ ...draft, ...patch });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left">
            {meal.name ? "Edit meal" : "New meal"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              className="h-12"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>

          <ListEditor
            label="Components & ingredients to verify"
            values={draft.items.map((i) => i.label)}
            onChange={(labels) =>
              set({
                items: labels.map((label, i) => ({
                  id: draft.items[i]?.id ?? uid(),
                  label,
                  kind: draft.items[i]?.kind ?? "ingredient",
                })),
              })
            }
          />
          <ListEditor
            label="Equipment"
            values={draft.equipment}
            onChange={(equipment) => set({ equipment })}
          />
          <ListEditor
            label="Prep / do ahead"
            values={draft.prep}
            onChange={(prep) => set({ prep })}
          />
          <ListEditor
            label="Cook / finish"
            values={draft.cook}
            onChange={(cook) => set({ cook })}
          />

          <div className="space-y-2">
            <Label htmlFor="planb">Plan B</Label>
            <Textarea
              id="planb"
              rows={2}
              placeholder="Your own fallback — nothing suggested here."
              value={draft.planB}
              onChange={(e) => set({ planB: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-12" onClick={() => onSave(draft)}>
            Save meal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

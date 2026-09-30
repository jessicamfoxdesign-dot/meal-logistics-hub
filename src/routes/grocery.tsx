import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { EmptyNote } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addGrocery,
  clearCheckedGroceries,
  patchGrocery,
  removeGrocery,
  toggleGrocery,
  uid,
  useKitchen,
} from "@/lib/kitchen/store";
import {
  GROCERY_GROUP_LABEL,
  GROCERY_GROUPS,
  categoryOf,
} from "@/lib/kitchen/groceryGroups";
import type { GroceryCategory, GroceryItem } from "@/lib/kitchen/types";

export const Route = createFileRoute("/grocery")({
  head: () => ({
    meta: [
      { title: "Grocery List — Kitchen Plan" },
      {
        name: "description",
        content: "A quick grocery checklist for an ad hoc shopping trip.",
      },
      { property: "og:title", content: "Grocery List — Kitchen Plan" },
      {
        property: "og:description",
        content: "A quick grocery checklist for an ad hoc shopping trip.",
      },
    ],
  }),
  component: GroceryPage,
});

function GroceryRow({ item }: { item: GroceryItem }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 ${
        item.done ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={item.done}
        onCheckedChange={() => toggleGrocery(item.id)}
        className="size-6"
        aria-label={item.text}
      />
      <p
        className={`flex-1 ${
          item.done ? "text-muted-foreground line-through" : ""
        }`}
      >
        {item.text}
      </p>
      <Select
        value={categoryOf(item)}
        onValueChange={(v) =>
          patchGrocery(item.id, { category: v as GroceryCategory })
        }
      >
        <SelectTrigger
          className="h-11 w-auto min-w-28 text-xs text-muted-foreground"
          aria-label={`Department for ${item.text}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROCERY_GROUPS.map((g) => (
            <SelectItem key={g} value={g}>
              {GROCERY_GROUP_LABEL[g]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="Remove"
        onClick={() => removeGrocery(item.id)}
      >
        <X className="size-4" />
      </Button>
    </li>
  );
}

function GroceryPage() {
  const { data, ready } = useKitchen();
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    addGrocery({ id: uid(), text, done: false });
    setDraft("");
  };

  const active = data.groceries.filter((g) => !g.done);
  const checked = data.groceries.filter((g) => g.done);
  const byGroup = GROCERY_GROUPS.map((g) => ({
    group: g,
    items: active.filter((i) => categoryOf(i) === g),
  })).filter((x) => x.items.length > 0);

  return (
    <Shell
      title="Grocery List"
      subtitle="Type it, hand over the phone, check it off."
    >
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            className="h-12"
            placeholder="Add a grocery item"
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
        ) : data.groceries.length === 0 ? (
          <EmptyNote>The list is empty.</EmptyNote>
        ) : (
          <div className="space-y-6">
            {byGroup.map(({ group, items }) => (
              <section key={group} className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {GROCERY_GROUP_LABEL[group]}
                </h2>
                <ul className="grid gap-2">
                  {items.map((item) => (
                    <GroceryRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}

            {checked.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  In the cart
                </h2>
                <ul className="grid gap-2">
                  {checked.map((item) => (
                    <GroceryRow key={item.id} item={item} />
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="h-12 w-full"
                  onClick={clearCheckedGroceries}
                >
                  Clear {checked.length} checked{" "}
                  {checked.length === 1 ? "item" : "items"}
                </Button>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </Shell>
  );
}

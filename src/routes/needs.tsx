import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { EmptyNote } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addNeed,
  removeNeed,
  toggleNeed,
  uid,
  useKitchen,
} from "@/lib/kitchen/store";

export const Route = createFileRoute("/needs")({
  head: () => ({
    meta: [
      { title: "Needs — Kitchen Plan" },
      {
        name: "description",
        content: "A light list of what to buy or make, gathered from preflight checks.",
      },
      { property: "og:title", content: "Needs — Kitchen Plan" },
      {
        property: "og:description",
        content: "A light list of what to buy or make, gathered from preflight checks.",
      },
    ],
  }),
  component: NeedsPage,
});

function NeedsPage() {
  const { data, ready } = useKitchen();
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    addNeed({ id: uid(), text, done: false });
    setDraft("");
  };

  return (
    <Shell title="Needs" subtitle="Buy it, make it, or cross it off.">
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            className="h-12"
            placeholder="Add something you need"
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
        ) : data.needs.length === 0 ? (
          <EmptyNote>The list is empty.</EmptyNote>
        ) : (
          <ul className="grid gap-2">
            {data.needs.map((need) => (
              <li
                key={need.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Checkbox
                  checked={need.done}
                  onCheckedChange={() => toggleNeed(need.id)}
                  className="size-6"
                  aria-label={need.text}
                />
                <div className="flex-1">
                  <p
                    className={need.done ? "text-muted-foreground line-through" : ""}
                  >
                    {need.text}
                  </p>
                  {need.sourceLabel ? (
                    <p className="text-xs text-muted-foreground">
                      for {need.sourceLabel}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Remove"
                  onClick={() => removeNeed(need.id)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

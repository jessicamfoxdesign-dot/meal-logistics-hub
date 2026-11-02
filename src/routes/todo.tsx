import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { TodoRow } from "@/components/kitchen/TodoRow";
import { Shell } from "@/components/kitchen/Shell";
import { EmptyNote } from "@/components/kitchen/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addTodo, clearCompletedTodos, uid, useKitchen } from "@/lib/kitchen/store";

export const Route = createFileRoute("/todo")({
  head: () => ({
    meta: [
      { title: "To-do — Kitchen Plan" },
      { name: "description", content: "A plain to-do list. Add it, check it off, done." },
      { property: "og:title", content: "To-do — Kitchen Plan" },
      { property: "og:description", content: "A plain to-do list. Add it, check it off, done." },
    ],
  }),
  component: TodoPage,
});

function TodoPage() {
  const { data, ready } = useKitchen();
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const groups = [
    ...new Set(data.todos.map((t) => t.group?.trim()).filter(Boolean) as string[]),
  ].sort();

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    addTodo({ id: uid(), text, done: false, ...(filter ? { group: filter } : {}) });
    setDraft("");
  };

  const shown = filter ? data.todos.filter((t) => t.group === filter) : data.todos;
  const open = shown.filter((t) => !t.done);
  const done = shown.filter((t) => t.done);

  return (
    <Shell title="To-do" subtitle="Star anything you want to see on Today.">
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            className="h-12"
            placeholder="Add a to-do"
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
        ) : data.todos.length === 0 ? (
          <EmptyNote>The list is empty.</EmptyNote>
        ) : (
          <div className="space-y-4">
            {groups.length > 0 ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by group">
                {[null, ...groups].map((g) => (
                  <Button
                    key={g ?? "all"}
                    variant={filter === g ? "secondary" : "ghost"}
                    className="h-11"
                    aria-pressed={filter === g}
                    onClick={() => setFilter(g)}
                  >
                    {g ?? "All"}
                  </Button>
                ))}
              </div>
            ) : null}
            <ul className="grid gap-2">
              {[...open, ...done].map((t) => (
                <TodoRow key={t.id} item={t} groups={groups} />
              ))}
            </ul>
            {done.length > 0 ? (
              <Button variant="outline" className="h-12 w-full" onClick={clearCompletedTodos}>
                Clear completed
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Shell>
  );
}

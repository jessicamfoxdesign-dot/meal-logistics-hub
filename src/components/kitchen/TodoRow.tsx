import { useState } from "react";
import { Pencil, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { patchTodo, removeTodo, toggleTodo } from "@/lib/kitchen/store";
import type { TodoItem } from "@/lib/kitchen/types";

export function TodoRow({ item, groups = [] }: { item: TodoItem; groups?: string[] }) {
  const [editing, setEditing] = useState(false);
  const [group, setGroup] = useState(item.group ?? "");
  const meta = [item.group, item.repeatable ? "Repeatable" : ""].filter(Boolean).join(" · ");
  return (
    <li
      className={`rounded-xl border border-border bg-card p-3 ${item.done ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={item.done}
          onCheckedChange={() => toggleTodo(item.id)}
          className="size-6"
          aria-label={item.text}
        />
        <div className="flex-1">
          <p className={item.done ? "text-muted-foreground line-through" : ""}>{item.text}</p>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={item.today ? "Remove from Today" : "Show on Today"}
          aria-pressed={!!item.today}
          onClick={() => patchTodo(item.id, { today: !item.today })}
        >
          <Star className={`size-5 ${item.today ? "fill-primary text-primary" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Edit group and type"
          aria-expanded={editing}
          onClick={() => {
            setGroup(item.group ?? "");
            setEditing((v) => !v);
          }}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label="Remove"
          onClick={() => removeTodo(item.id)}
        >
          <X className="size-4" />
        </Button>
      </div>
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Type">
            {([false, true] as const).map((rep) => (
              <Button
                key={String(rep)}
                variant={!!item.repeatable === rep ? "secondary" : "ghost"}
                className="h-11"
                aria-pressed={!!item.repeatable === rep}
                onClick={() => patchTodo(item.id, { repeatable: rep || undefined })}
              >
                {rep ? "Repeatable" : "One-off"}
              </Button>
            ))}
          </div>
          <Input
            className="h-11 w-48"
            placeholder="Group (optional)"
            list={`todo-groups-${item.id}`}
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          />
          <datalist id={`todo-groups-${item.id}`}>
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <Button
            className="h-11"
            onClick={() => {
              patchTodo(item.id, { group: group.trim() || undefined });
              setEditing(false);
            }}
          >
            Save
          </Button>
        </div>
      ) : null}
    </li>
  );
}

import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { patchTodo, removeTodo, toggleTodo } from "@/lib/kitchen/store";
import type { TodoItem } from "@/lib/kitchen/types";

export function TodoRow({ item }: { item: TodoItem }) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 ${
        item.done ? "opacity-60" : ""
      }`}
    >
      <Checkbox
        checked={item.done}
        onCheckedChange={() => toggleTodo(item.id)}
        className="size-6"
        aria-label={item.text}
      />
      <p className={`flex-1 ${item.done ? "text-muted-foreground line-through" : ""}`}>
        {item.text}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-pressed={!!item.today}
        aria-label={item.today ? "Remove from Today" : "Show on Today"}
        onClick={() => patchTodo(item.id, { today: !item.today })}
      >
        <Star className={`size-5 ${item.today ? "fill-primary text-primary" : ""}`} />
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
    </li>
  );
}


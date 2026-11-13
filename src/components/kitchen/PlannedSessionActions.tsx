import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, choosePlannedSession, useToday } from "@/lib/kitchen/store";
import type { ListChoice } from "@/lib/kitchen/planned";
import type { PlanEntry } from "@/lib/kitchen/types";

export function PlannedSessionActions({ entry, done }: { entry: PlanEntry; done: boolean }) {
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const apply = (choice: ListChoice) => {
    const undo = choosePlannedSession(entry.id, choice);
    toast(choice.kind === "done" ? (done ? "Reopened" : "Done") : choice.kind === "skip" ? "Skipped" : "Moved", {
      action: { label: "Undo", onClick: undo },
    });
    setOpen(false);
  };
  if (entry.skipped) return (
    <Button variant="outline" className="h-11" onClick={() => apply({ kind: "move", date: entry.date })}>
      Restore
    </Button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-11" onClick={() => apply({ kind: "done" })}>
        {done ? "Reopen" : "Done"}
      </Button>
      {!done ? <>
        <Button variant="ghost" className="h-11" onClick={() => apply({ kind: "skip" })}>Skip</Button>
        {entry.date < today ? (
          <Button variant="outline" className="h-11" onClick={() => apply({ kind: "move", date: today })}>Today</Button>
        ) : null}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild><Button variant="outline" className="h-11">Defer</Button></PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2">
            <Button variant="ghost" className="h-11 w-full justify-start" onClick={() => apply({ kind: "move", date: addDays(today, 1) })}>Tomorrow</Button>
            <Input type="date" aria-label="Defer to date" className="h-11" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button className="h-11 w-full" disabled={!date || date === entry.date} onClick={() => apply({ kind: "move", date })}>Move</Button>
          </PopoverContent>
        </Popover>
      </> : null}
    </div>
  );
}
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notesForDate } from "@/lib/kitchen/dateNotes";
import { removeDateNote, saveDateNote, uid, useKitchen } from "@/lib/kitchen/store";

export function DateNotes({ date, editable = false }: { date: string; editable?: boolean }) {
  const { data } = useKitchen();
  const notes = notesForDate(data.dateNotes, date);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");

  const cancel = () => {
    setEditing(null);
    setText("");
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim() || editing === null) return;
    saveDateNote({ id: editing === "new" ? uid() : editing, date, text });
    cancel();
  };

  if (!editable && notes.length === 0) return null;

  return (
    <div className="space-y-1">
      {notes.length > 0 ? (
        <ul className="space-y-1">
          {notes.map((note, index) => (
            <li key={note.id} className="flex items-start gap-1">
              <p className="min-w-0 flex-1 py-2 text-sm whitespace-pre-wrap break-words">{note.text}</p>
              {editable ? (
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Edit note ${index + 1}`} title="Edit note"
                    onClick={() => { setEditing(note.id); setText(note.text); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-11" aria-label={`Delete note ${index + 1}`} title="Delete note"
                    onClick={() => { removeDateNote(note.id); if (editing === note.id) cancel(); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editable && editing !== null ? (
        <form onSubmit={save} className="space-y-2">
          <Textarea autoFocus aria-label="Date note" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" className="h-11" disabled={!text.trim()}>Save note</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={cancel}>Cancel</Button>
          </div>
        </form>
      ) : editable ? (
        <Button variant="ghost" className="h-11 px-2 text-muted-foreground" onClick={() => { setEditing("new"); setText(""); }}>
          <Plus className="size-4" /> Add note
        </Button>
      ) : null}
    </div>
  );
}
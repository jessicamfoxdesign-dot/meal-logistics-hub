import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HandHelping, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
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
import {
  deleteEquipment,
  saveEquipment,
  uid,
  useKitchen,
} from "@/lib/kitchen/store";
import {
  EQUIPMENT_CATEGORY_LABEL,
  type Equipment,
  type EquipmentCategory,
} from "@/lib/kitchen/types";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment — Kitchen Plan" },
      {
        name: "description",
        content:
          "Where each piece of kitchen equipment lives, and which ones need help or a clean first.",
      },
      { property: "og:title", content: "Equipment — Kitchen Plan" },
      {
        property: "og:description",
        content:
          "Where each piece of kitchen equipment lives, and which ones need help or a clean first.",
      },
    ],
  }),
  component: EquipmentPage,
});

const CATEGORIES: EquipmentCategory[] = ["everyday", "staged", "stored"];

const emptyEquipment = (): Equipment => ({
  id: uid(),
  name: "",
  location: "",
  notes: "",
  category: "staged",
  helpNeeded: false,
  cleanFirst: false,
  related: [],
});

function EquipmentPage() {
  const { data, ready } = useKitchen();
  const [editing, setEditing] = useState<Equipment | null>(null);

  return (
    <Shell
      title="Equipment"
      subtitle="What you have, where it lives, and what it takes to get it out."
      action={
        <Button className="h-11" onClick={() => setEditing(emptyEquipment())}>
          <Plus className="size-4" /> Add
        </Button>
      }
    >
      {!ready ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const list = data.equipment.filter((e) => e.category === cat);
            if (list.length === 0) return null;
            return (
              <section key={cat} className="space-y-3">
                <h2 className="text-xl">{EQUIPMENT_CATEGORY_LABEL[cat]}</h2>
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((eq) => (
                    <li
                      key={eq.id}
                      className={`rounded-2xl border p-4 ${
                        eq.helpNeeded
                          ? "border-attention-border bg-attention/30"
                          : "border-border bg-card"
                      }`}
                    >
                      <h3 className="text-lg">{eq.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {eq.location || "Location not set"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {eq.helpNeeded ? (
                          <span className="flex items-center gap-1 rounded-full border border-attention-border bg-attention px-2.5 py-1 text-attention-foreground">
                            <HandHelping className="size-3.5" /> Help to retrieve
                          </span>
                        ) : null}
                        {eq.cleanFirst ? (
                          <span className="flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-secondary-foreground">
                            <Sparkles className="size-3.5" /> Clean / check first
                          </span>
                        ) : null}
                      </div>
                      {eq.notes ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {eq.notes}
                        </p>
                      ) : null}
                      {eq.related.length > 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Used for: {eq.related.join(", ")}
                        </p>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="secondary"
                          className="h-11"
                          onClick={() => setEditing({ ...eq })}
                        >
                          <Pencil className="size-4" /> Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-11 text-muted-foreground"
                          aria-label="Delete equipment"
                          onClick={() => deleteEquipment(eq.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <EquipmentEditor
        equipment={editing}
        onClose={() => setEditing(null)}
        onSave={(e) => {
          saveEquipment(e);
          setEditing(null);
        }}
      />
    </Shell>
  );
}

function EquipmentEditor({
  equipment,
  onClose,
  onSave,
}: {
  equipment: Equipment | null;
  onClose: () => void;
  onSave: (e: Equipment) => void;
}) {
  const [draft, setDraft] = useState<Equipment | null>(equipment);
  if (equipment && (!draft || draft.id !== equipment.id)) setDraft(equipment);
  if (!equipment || !draft) return null;

  const set = (patch: Partial<Equipment>) => setDraft({ ...draft, ...patch });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">
            {equipment.name ? "Edit equipment" : "Add equipment"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="eqname">Name</Label>
            <Input
              id="eqname"
              className="h-12"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eqloc">Location</Label>
            <Input
              id="eqloc"
              className="h-12"
              value={draft.location}
              onChange={(e) => set({ location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={draft.category === c ? "default" : "outline"}
                  className="h-11"
                  onClick={() => set({ category: c })}
                >
                  {EQUIPMENT_CATEGORY_LABEL[c]}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="help">Help needed to retrieve</Label>
            <Switch
              id="help"
              checked={draft.helpNeeded}
              onCheckedChange={(helpNeeded) => set({ helpNeeded })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <Label htmlFor="clean">Clean / check before use</Label>
            <Switch
              id="clean"
              checked={draft.cleanFirst}
              onCheckedChange={(cleanFirst) => set({ cleanFirst })}
            />
          </div>
          <ListEditor
            label="Related meals & missions"
            values={draft.related}
            onChange={(related) => set({ related })}
          />
          <div className="space-y-2">
            <Label htmlFor="eqnotes">Notes</Label>
            <Textarea
              id="eqnotes"
              rows={2}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-12" onClick={() => onSave(draft)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

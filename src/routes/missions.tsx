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
import {
  deleteMission,
  saveMission,
  uid,
  useKitchen,
} from "@/lib/kitchen/store";
import { emptyMission } from "@/lib/kitchen/create";
import type { Mission } from "@/lib/kitchen/types";

export const Route = createFileRoute("/missions")({
  head: () => ({
    meta: [
      { title: "Missions — Kitchen Plan" },
      {
        name: "description",
        content:
          "Kitchen projects with advance logistics: equipment retrieval, setup, and finishing tasks.",
      },
      { property: "og:title", content: "Missions — Kitchen Plan" },
      {
        property: "og:description",
        content:
          "Kitchen projects with advance logistics: equipment retrieval, setup, and finishing tasks.",
      },
    ],
  }),
  component: MissionsPage,
});

function MissionsPage() {
  const { data, ready } = useKitchen();
  const [editing, setEditing] = useState<Mission | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const missions = data.missions.filter((m) => m.archived === showArchived);
  const helpNames = new Set(
    data.equipment.filter((e) => e.helpNeeded).map((e) => e.name),
  );

  return (
    <Shell
      title="Missions"
      subtitle="Projects with logistics — the fetching and cleaning that has to happen first."
      action={
        <Button className="h-11" onClick={() => setEditing(emptyMission())}>
          <Plus className="size-4" /> New mission
        </Button>
      }
    >
      <div className="mb-5 flex items-center gap-3">
        <Switch
          id="archived-missions"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        <Label htmlFor="archived-missions">Show archived</Label>
      </div>

      {!ready ? (
        <EmptyNote>Loading…</EmptyNote>
      ) : missions.length === 0 ? (
        <EmptyNote>Nothing here yet.</EmptyNote>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {missions.map((mission) => {
            const needsHelp = mission.equipment.some((e) => helpNames.has(e));
            return (
              <li
                key={mission.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <h2 className="text-xl">{mission.name || "Untitled"}</h2>
                {mission.notes ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mission.notes}
                  </p>
                ) : null}
                {needsHelp ? (
                  <p className="mt-2 rounded-lg border border-attention-border bg-attention/50 px-3 py-2 text-sm text-attention-foreground">
                    Help needed to retrieve equipment — ask ahead.
                  </p>
                ) : null}
                <dl className="mt-3 grid gap-1 text-sm text-muted-foreground">
                  <div>{mission.setup.length} setup-ahead tasks</div>
                  <div>{mission.prep.length} prep tasks</div>
                  <div>{mission.finish.length} finish tasks</div>
                  {mission.equipment.length > 0 ? (
                    <div>Equipment: {mission.equipment.join(", ")}</div>
                  ) : null}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="h-11"
                    onClick={() => setEditing({ ...mission })}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() =>
                      saveMission({
                        ...mission,
                        id: uid(),
                        name: `${mission.name} (copy)`,
                        items: mission.items.map((i) => ({ ...i, id: uid() })),
                      })
                    }
                  >
                    <Copy className="size-4" /> Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11"
                    onClick={() =>
                      saveMission({ ...mission, archived: !mission.archived })
                    }
                  >
                    {mission.archived ? "Unarchive" : "Archive"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground"
                    aria-label="Delete mission"
                    onClick={() => deleteMission(mission.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <MissionEditor
        mission={editing}
        onClose={() => setEditing(null)}
        onSave={(m) => {
          saveMission(m);
          setEditing(null);
        }}
      />
    </Shell>
  );
}

function MissionEditor({
  mission,
  onClose,
  onSave,
}: {
  mission: Mission | null;
  onClose: () => void;
  onSave: (m: Mission) => void;
}) {
  const [draft, setDraft] = useState<Mission | null>(mission);
  if (mission && (!draft || draft.id !== mission.id)) setDraft(mission);
  if (!mission || !draft) return null;

  const set = (patch: Partial<Mission>) => setDraft({ ...draft, ...patch });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left">
            {mission.name ? "Edit mission" : "New mission"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mname">Name</Label>
            <Input
              id="mname"
              className="h-12"
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mnotes">Notes</Label>
            <Textarea
              id="mnotes"
              rows={2}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
          <ListEditor
            label="Things to check"
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
            label="Setup ahead (retrieve, clean, check)"
            values={draft.setup}
            onChange={(setup) => set({ setup })}
          />
          <ListEditor
            label="Prep"
            values={draft.prep}
            onChange={(prep) => set({ prep })}
          />
          <ListEditor
            label="Finish"
            values={draft.finish}
            onChange={(finish) => set({ finish })}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button className="h-12" onClick={() => onSave(draft)}>
            Save mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

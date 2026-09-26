import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, RotateCcw, Upload } from "lucide-react";
import { Shell } from "@/components/kitchen/Shell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  dayKey,
  exportJson,
  parseBackup,
  resetToSamples,
  restoreBackup,
  useKitchen,
} from "@/lib/kitchen/store";
import type { KitchenData } from "@/lib/kitchen/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & backup — Kitchen Plan" },
      {
        name: "description",
        content: "Export or import a backup of your meals, missions, equipment and plan.",
      },
      { property: "og:title", content: "Settings & backup — Kitchen Plan" },
      {
        property: "og:description",
        content: "Export or import a backup of your meals, missions, equipment and plan.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useKitchen();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<KitchenData | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const doExport = () => {
    downloadJson(exportJson(), `kitchen-compass-${dayKey(new Date())}.json`);
    setMessage({ kind: "ok", text: "Backup downloaded." });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (err) {
      setMessage({
        kind: "error",
        text: `${err instanceof Error ? err.message : "Couldn't read that file."} Nothing was changed.`,
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Shell title="Settings" subtitle="Account, sharing and backups.">
      <div className="space-y-6">
        <AccountSection />

        <LocalCopySection />

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl">Backup</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Your kitchen plan is saved online and shared across your devices. A backup file is
            extra peace of mind.
          </p>
          <p className="text-sm text-muted-foreground">
            Currently: {data.meals.length} meals · {data.missions.length} missions ·{" "}
            {data.equipment.length} equipment · {data.entries.length} plan entries ·{" "}
            {data.needs.length} needs
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" onClick={doExport}>
              <Download className="size-4" /> Export backup
            </Button>
            <Button variant="secondary" className="h-11" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Import backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
          {message ? (
            <p
              role="status"
              className={`rounded-xl border p-3 text-sm ${
                message.kind === "error"
                  ? "border-attention-border bg-attention/40 text-attention-foreground"
                  : "border-border bg-secondary"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </section>

        <SharingSection />

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl">Start over</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Replace everything — for everyone with access — with the original sample meals,
            missions and equipment.
          </p>
          <Button variant="outline" className="h-11" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-4" /> Reset to samples
          </Button>
        </section>
      </div>

      <AlertDialog open={!!pending} onOpenChange={(v) => !v && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current data?</AlertDialogTitle>
            <AlertDialogDescription>
              This backup has {pending?.meals.length} meals, {pending?.missions.length}{" "}
              missions, {pending?.equipment.length} equipment items and{" "}
              {pending?.entries.length} plan entries. Your current data will be replaced.
              Consider exporting first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => {
                if (pending) restoreBackup(pending);
                setPending(null);
                setMessage({ kind: "ok", text: "Backup restored." });
              }}
            >
              Replace with backup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to sample data?</AlertDialogTitle>
            <AlertDialogDescription>
              Your meals, missions, equipment and plan will be replaced with the samples.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => {
                resetToSamples();
                setMessage({ kind: "ok", text: "Sample data restored." });
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

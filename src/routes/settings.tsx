import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, LogOut, RotateCcw, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/components/kitchen/AuthGate";
import { Input } from "@/components/ui/input";
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
  countsOf,
  dayKey,
  downloadJson,
  readLegacy,
  type LegacyInfo,
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
            {data.needs.length} needs · {data.groceries.length} groceries ·{" "}
            {data.todos.length} to-dos · {data.chores.length} chores
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

function useEmail() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return email;
}

function AccountSection() {
  const email = useEmail();
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-xl">Account</h2>
        <p className="text-sm text-muted-foreground">Signed in as {email ?? "…"}</p>
      </div>
      <Button variant="outline" className="h-11" onClick={() => void signOut()}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </section>
  );
}

function LocalCopySection() {
  const [legacy, setLegacy] = useState<LegacyInfo | null>(null);
  useEffect(() => setLegacy(readLegacy()), []);
  if (!legacy?.raw || legacy.status === "uploaded") return null;
  const c = legacy.data ? countsOf(legacy.data) : null;
  return (
    <section className="space-y-3 rounded-2xl border border-attention-border bg-attention/40 p-5">
      <h2 className="text-xl">This device has a copy that wasn't uploaded</h2>
      <p className="max-w-prose text-sm">
        Data saved on this device before the app moved online is still here, untouched
        {c
          ? ` (${c.meals} meals, ${c.missions} missions, ${c.equipment} equipment, ${c.entries} plan entries, ${c.needs} needs)`
          : ""}
        . It was not merged into the shared plan. Download it so nothing is lost — you can
        import it later if you want it back.
      </p>
      <Button
        className="h-11"
        onClick={() =>
          downloadJson(legacy.raw!, `kitchen-compass-device-copy-${dayKey(new Date())}.json`)
        }
      >
        <Download className="size-4" /> Download this device's copy
      </Button>
    </section>
  );
}

function SharingSection() {
  const me = useEmail();
  const [emails, setEmails] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("allowed_emails")
      .select("email")
      .order("added_at");
    if (error) setError("Couldn't load the list.");
    else setEmails((data ?? []).map((r) => r.email));
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const email = value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("That doesn't look like an email address.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("allowed_emails").insert({ email });
    setBusy(false);
    if (error) {
      setError(error.code === "23505" ? "That address already has access." : "Couldn't add that address.");
      return;
    }
    setValue("");
    void load();
  };

  const remove = async (email: string) => {
    if (!window.confirm(`Remove access for ${email}?`)) return;
    const { error } = await supabase.from("allowed_emails").delete().eq("email", email);
    if (error) setError("Couldn't remove that address.");
    void load();
  };

  const isMe = (e: string) => !!me && e.toLowerCase() === me.toLowerCase();

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl">Who can use this plan</h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Everyone listed shares the same meals, plan, equipment and needs. They sign in with the
        Google account for that address.
      </p>
      <ul className="grid gap-2">
        {emails.map((e) => (
          <li
            key={e}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-2 pl-3"
          >
            <span className="min-w-0 truncate">
              {e}
              {isMe(e) ? <span className="text-muted-foreground"> (you)</span> : null}
            </span>
            <Button
              variant="ghost"
              className="h-11"
              disabled={isMe(e) || emails.length <= 1}
              onClick={() => void remove(e)}
              aria-label={`Remove ${e}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          void add();
        }}
      >
        <Input
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="name@example.com"
          className="h-11 min-w-56 flex-1"
          aria-label="Email address to add"
        />
        <Button type="submit" className="h-11" disabled={busy || !value.trim()}>
          Add
        </Button>
      </form>
      {error ? <p className="text-sm text-attention-foreground">{error}</p> : null}
    </section>
  );
}

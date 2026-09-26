import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { ChefHat, CloudOff, LoaderCircle, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import {
  countsOf,
  hasUnsavedChanges,
  isServerEmpty,
  readLegacy,
  refreshFromServer,
  replaceAll,
  retrySaves,
  setLegacyStatus,
  startSync,
  stopSync,
  useSyncState,
  type LegacyInfo,
} from "@/lib/kitchen/store";

type Access = "checking" | "signed-out" | "denied" | "allowed" | "error";

export async function signOut() {
  if (hasUnsavedChanges() && !window.confirm("Some changes haven't saved yet. Sign out anyway?"))
    return;
  await supabase.auth.signOut();
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access>("checking");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      stopSync();
      setAccess("signed-out");
      return;
    }
    let cancelled = false;
    setAccess("checking");
    void supabase.rpc("is_allowed").then(({ data, error }) => {
      if (cancelled) return;
      if (error) return setAccess("error");
      if (data) {
        setAccess("allowed");
        void startSync();
      } else {
        stopSync();
        setAccess("denied");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session === null]);

  // Pick up changes made on another device when coming back to the app.
  useEffect(() => {
    if (access !== "allowed") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshFromServer();
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [access]);

  if (session === undefined || access === "checking") {
    return <Centered><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></Centered>;
  }
  if (access === "signed-out") return <SignIn />;
  if (access === "denied")
    return (
      <Centered>
        <Card>
          <h1 className="text-2xl">You don't have access to this app</h1>
          <p className="text-muted-foreground">
            You're signed in as <strong>{session?.user.email}</strong>, which isn't on the list
            of people who can use this kitchen plan. If you think it should be, ask the owner to
            add this address.
          </p>
          <Button variant="outline" className="h-11" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </Card>
      </Centered>
    );
  if (access === "error")
    return (
      <Centered>
        <Card>
          <h1 className="text-2xl">Couldn't reach the server</h1>
          <p className="text-muted-foreground">Check your connection and try again.</p>
          <Button className="h-11" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </Card>
      </Centered>
    );

  return (
    <>
      <LegacyPrompt>{children}</LegacyPrompt>
      <SaveIndicator />
    </>
  );
}

function LegacyPrompt({ children }: { children: ReactNode }) {
  const sync = useSyncState();
  const [legacy, setLegacy] = useState<LegacyInfo | null>(null);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    setLegacy(readLegacy());
  }, []);

  if (!sync.serverLoaded) {
    if (sync.loadError && !sync.ready)
      return (
        <Centered>
          <Card>
            <h1 className="text-2xl">Couldn't load your kitchen plan</h1>
            <p className="text-muted-foreground">{sync.loadError}</p>
            <Button className="h-11" onClick={() => void refreshFromServer()}>
              Try again
            </Button>
          </Card>
        </Centered>
      );
    // Don't decide about the local copy until the server has answered.
    if (!sync.ready)
      return <Centered><LoaderCircle className="size-6 animate-spin text-muted-foreground" /></Centered>;
    return <>{children}</>;
  }

  const shouldAsk =
    !decided &&
    legacy?.data &&
    !legacy.status &&
    isServerEmpty() &&
    Object.values(countsOf(legacy.data)).some((n) => n > 0);

  if (!shouldAsk || !legacy?.data) return <>{children}</>;
  const c = countsOf(legacy.data);
  const local = legacy.data;

  return (
    <Centered>
      <Card>
        <h1 className="text-2xl">Found existing data on this device — upload it?</h1>
        <p className="text-muted-foreground">
          Your shared kitchen plan is empty, but this device has a saved copy from before:
        </p>
        <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
          <li>{c.meals} meals</li>
          <li>{c.missions} missions</li>
          <li>{c.equipment} equipment</li>
          <li>{c.entries} plan entries</li>
          <li>{c.needs} needs</li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11"
            onClick={() => {
              replaceAll(local);
              setLegacyStatus("uploaded");
              setDecided(true);
            }}
          >
            Upload this data
          </Button>
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              setLegacyStatus("dismissed");
              setDecided(true);
            }}
          >
            Start fresh
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Either way, the copy on this device is kept. You can download it later from Settings.
        </p>
      </Card>
    </Centered>
  );
}

function SaveIndicator() {
  const s = useSyncState();
  if (s.saveError) {
    return (
      <div
        role="alert"
        className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded-xl border border-attention-border bg-attention p-3 text-attention-foreground shadow-lg md:bottom-4"
      >
        <CloudOff className="size-5 shrink-0" />
        <p className="min-w-0 flex-1 text-sm">
          {s.unsaved} change{s.unsaved === 1 ? "" : "s"} not saved yet. Keep this page open.
        </p>
        <Button className="h-11" onClick={retrySaves}>
          Retry
        </Button>
      </div>
    );
  }
  if (s.saving) {
    return (
      <div className="pointer-events-none fixed right-3 bottom-20 z-50 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow md:bottom-4">
        <LoaderCircle className="size-3.5 animate-spin" /> Saving…
      </div>
    );
  }
  return null;
}

function SignIn() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Centered>
      <Card>
        <ChefHat className="size-8 text-primary" />
        <h1 className="text-3xl">Kitchen Plan</h1>
        <p className="text-muted-foreground">
          Sign in to see your shared meals, plan and equipment on any device.
        </p>
        <Button
          className="h-12 text-base"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              setError("Sign-in didn't complete. Please try again.");
              setBusy(false);
            }
          }}
        >
          Continue with Google
        </Button>
        {error ? <p className="text-sm text-attention-foreground">{error}</p> : null}
      </Card>
    </Centered>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {children}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      {children}
    </div>
  );
}

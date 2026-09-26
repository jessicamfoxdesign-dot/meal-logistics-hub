import { useCallback, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildSeed } from "./seed";
import { normalizeData } from "./normalize";
import type {
  Equipment,
  KitchenData,
  Meal,
  Mission,
  NeedItem,
  PlanEntry,
} from "./types";

/**
 * Server-backed store. The backend is authoritative; localStorage holds only a
 * read cache (CACHE_KEY). The old pre-backend data under LEGACY_KEY is never
 * written or deleted by this module.
 */
const CACHE_KEY = "kitchen-plan-cache-v2";
export const LEGACY_KEY = "kitchen-plan-v1";
const LEGACY_STATUS_KEY = "kitchen-plan-v1-status"; // "uploaded" | "dismissed"

type Collection = keyof KitchenData;
const TABLE: Record<Collection, "meals" | "missions" | "equipment" | "plan_entries" | "needs"> = {
  meals: "meals",
  missions: "missions",
  equipment: "equipment",
  entries: "plan_entries",
  needs: "needs",
};
const COLLECTIONS = Object.keys(TABLE) as Collection[];

const emptyData: KitchenData = {
  meals: [],
  missions: [],
  equipment: [],
  entries: [],
  needs: [],
};

export interface SyncState {
  /** true once cache or server data is available */
  ready: boolean;
  /** true once the server has answered at least once */
  serverLoaded: boolean;
  loadError: string | null;
  saving: boolean;
  /** number of changes that failed to save and are waiting */
  unsaved: number;
  saveError: string | null;
}

let data: KitchenData = emptyData;
let sync: SyncState = {
  ready: false,
  serverLoaded: false,
  loadError: null,
  saving: false,
  unsaved: 0,
  saveError: null,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}
function setSync(patch: Partial<SyncState>) {
  sync = { ...sync, ...patch };
  emit();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ---------- dates ---------- */

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): [number, number, number] {
  const parts = key.split("-").map(Number);
  return [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
}

export function addDays(key: string, n: number) {
  const [y, m, d] = parseKey(key);
  return dayKey(new Date(y, m - 1, d + n));
}

export function formatDay(key: string) {
  const [y, m, d] = parseKey(key);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function shortDay(key: string) {
  const [y, m, d] = parseKey(key);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
  });
}

/* ---------- cache ---------- */

function writeCache() {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* cache only */
  }
}

function readCache(): KitchenData | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? parseBackup(raw) : null;
  } catch {
    return null;
  }
}

/* ---------- server load ---------- */

async function fetchServer(): Promise<KitchenData> {
  const results = await Promise.all(
    COLLECTIONS.map((c) =>
      supabase.from(TABLE[c]).select("id,data").order("seq", { ascending: true }),
    ),
  );
  const next = { ...emptyData } as Record<Collection, unknown[]>;
  results.forEach((r, i) => {
    if (r.error) throw new Error(r.error.message);
    next[COLLECTIONS[i]!] = (r.data ?? []).map((row) => row.data);
  });
  return normalizeData(next as unknown as KitchenData);
}

let started = false;

/** Call once the signed-in user is confirmed to have access. */
export async function startSync() {
  if (started) return;
  started = true;
  const cached = readCache();
  if (cached) {
    data = cached;
    setSync({ ready: true });
  }
  await refreshFromServer();
}

export async function refreshFromServer() {
  // Never overwrite local state while edits are still in flight or unsaved.
  if (queue.length > 0 || running) return;
  try {
    const next = await fetchServer();
    if (queue.length > 0 || running) return;
    data = next;
    writeCache();
    setSync({ ready: true, serverLoaded: true, loadError: null });
  } catch (err) {
    setSync({
      loadError: err instanceof Error ? err.message : "Couldn't reach the server.",
    });
  }
}

export function stopSync() {
  started = false;
  data = emptyData;
  queue.length = 0;
  sync = {
    ready: false,
    serverLoaded: false,
    loadError: null,
    saving: false,
    unsaved: 0,
    saveError: null,
  };
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function isServerEmpty() {
  return COLLECTIONS.every((c) => data[c].length === 0);
}

/* ---------- write queue ---------- */

type Op = () => Promise<void>;
const queue: Op[] = [];
let running = false;

function enqueue(op: Op) {
  queue.push(op);
  if (sync.saveError) {
    setSync({ unsaved: queue.length });
    return; // wait for retry so order is preserved
  }
  void pump();
}

async function pump() {
  if (running) return;
  running = true;
  setSync({ saving: true });
  while (queue.length > 0) {
    const op = queue[0]!;
    try {
      await op();
      queue.shift();
    } catch (err) {
      running = false;
      setSync({
        saving: false,
        unsaved: queue.length,
        saveError: err instanceof Error ? err.message : "Save failed",
      });
      return;
    }
  }
  running = false;
  setSync({ saving: false, unsaved: 0, saveError: null });
}

export function retrySaves() {
  setSync({ saveError: null });
  void pump();
}

export function hasUnsavedChanges() {
  return queue.length > 0;
}

const check = (r: { error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
};

function upsertRows(c: Collection, rows: { id: string }[]) {
  if (rows.length === 0) return Promise.resolve();
  return supabase
    .from(TABLE[c])
    .upsert(
      rows.map((r) => ({
        id: r.id,
        data: JSON.parse(JSON.stringify(r)),
        updated_at: new Date().toISOString(),
      })),
    )
    .then(check);
}

function deleteRows(c: Collection, ids: string[]) {
  if (ids.length === 0) return Promise.resolve();
  return supabase.from(TABLE[c]).delete().in("id", ids).then(check);
}

/**
 * Apply a change locally (instantly) and send only the rows that changed.
 * Mutations create new objects for changed rows, so identity comparison is enough.
 */
export function update(fn: (d: KitchenData) => KitchenData) {
  const prev = data;
  const next = fn(prev);
  data = next;
  writeCache();
  emit();
  for (const c of COLLECTIONS) {
    if (prev[c] === next[c]) continue;
    const before = new Map<string, unknown>(prev[c].map((x) => [x.id, x]));
    const changed = (next[c] as { id: string }[]).filter(
      (x) => before.get(x.id) !== x,
    );
    const keep = new Set(next[c].map((x) => x.id));
    const removed = prev[c].map((x) => x.id).filter((id) => !keep.has(id));
    enqueue(async () => {
      await upsertRows(c, changed);
      await deleteRows(c, removed);
    });
  }
}

/**
 * Replace the whole shared dataset (import, reset, first upload).
 * Writes the new rows first, then removes rows not in the new set, so a
 * failure part-way never leaves the dataset emptier than before.
 */
export function replaceAll(next: KitchenData) {
  data = { ...emptyData, ...next };
  writeCache();
  emit();
  const snapshot = data;
  enqueue(async () => {
    for (const c of COLLECTIONS) {
      await upsertRows(c, snapshot[c]);
    }
    for (const c of COLLECTIONS) {
      const keep = snapshot[c].map((x) => x.id);
      let q = supabase.from(TABLE[c]).delete();
      q =
        keep.length > 0
          ? q.not("id", "in", `(${keep.map((id) => `"${id.replace(/"/g, "")}"`).join(",")})`)
          : q.neq("id", "");
      check(await q);
    }
  });
}

/* ---------- hooks ---------- */

export function useKitchen() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => data,
    () => emptyData,
  );
  const s = useSyncExternalStore(
    subscribe,
    () => sync,
    () => sync,
  );
  return { data: snapshot, ready: s.ready };
}

export function useSyncState() {
  return useSyncExternalStore(
    subscribe,
    () => sync,
    () => sync,
  );
}

export function useToday() {
  // Client-only render (behind the sign-in gate), so reading the date is safe.
  return dayKey(new Date());
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function resetToSamples() {
  const today = dayKey(new Date());
  replaceAll(buildSeed(today, addDays(today, 1)));
}

/* ---------- backup ---------- */

export function exportJson() {
  return JSON.stringify(data, null, 2);
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const allHave = (arr: unknown, keys: string[]) =>
  Array.isArray(arr) &&
  arr.every((x) => isObj(x) && keys.every((k) => typeof x[k] === "string"));

/** Returns parsed data or throws an Error with a friendly message. Never touches stored data. */
export function parseBackup(text: string): KitchenData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a readable backup (not valid JSON).");
  }
  if (!isObj(raw)) throw new Error("This file doesn't look like a Kitchen Plan backup.");
  const checks: [keyof KitchenData, string[]][] = [
    ["meals", ["id", "name"]],
    ["missions", ["id", "name"]],
    ["equipment", ["id", "name"]],
    ["entries", ["id", "date", "title"]],
    ["needs", ["id", "text"]],
  ];
  for (const [key, fields] of checks) {
    if (!allHave(raw[key], fields))
      throw new Error(`This file doesn't look like a Kitchen Plan backup (problem with "${key}").`);
  }
  const entriesOk = (raw["entries"] as Record<string, unknown>[]).every(
    (e) => Array.isArray(e["items"]) && Array.isArray(e["tasks"]),
  );
  if (!entriesOk) throw new Error("This backup's plan entries are incomplete.");
  return normalizeData(raw as unknown as KitchenData);
}

export function restoreBackup(next: KitchenData) {
  replaceAll(next);
}

/* ---------- legacy (pre-backend) device data ---------- */

export interface LegacyInfo {
  data: KitchenData | null;
  raw: string | null;
  status: string | null;
  error: string | null;
}

export function readLegacy(): LegacyInfo {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    const status = window.localStorage.getItem(LEGACY_STATUS_KEY);
    if (!raw) return { data: null, raw: null, status, error: null };
    try {
      return { data: parseBackup(raw), raw, status, error: null };
    } catch (e) {
      return { data: null, raw, status, error: e instanceof Error ? e.message : "Unreadable" };
    }
  } catch {
    return { data: null, raw: null, status: null, error: null };
  }
}

export function setLegacyStatus(status: "uploaded" | "dismissed") {
  try {
    window.localStorage.setItem(LEGACY_STATUS_KEY, status);
  } catch {
    /* ignore */
  }
}

export function countsOf(d: KitchenData) {
  return {
    meals: d.meals.length,
    missions: d.missions.length,
    equipment: d.equipment.length,
    entries: d.entries.length,
    needs: d.needs.length,
  };
}

export function downloadJson(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- mutations ---------- */

export const saveMeal = (meal: Meal) =>
  update((d) => ({
    ...d,
    meals: d.meals.some((m) => m.id === meal.id)
      ? d.meals.map((m) => (m.id === meal.id ? meal : m))
      : [...d.meals, meal],
  }));

export const deleteMeal = (mealId: string) =>
  update((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== mealId) }));

export const saveMission = (mission: Mission) =>
  update((d) => ({
    ...d,
    missions: d.missions.some((m) => m.id === mission.id)
      ? d.missions.map((m) => (m.id === mission.id ? mission : m))
      : [...d.missions, mission],
  }));

export const deleteMission = (missionId: string) =>
  update((d) => ({
    ...d,
    missions: d.missions.filter((m) => m.id !== missionId),
  }));

export const saveEquipment = (eq: Equipment) =>
  update((d) => ({
    ...d,
    equipment: d.equipment.some((e) => e.id === eq.id)
      ? d.equipment.map((e) => (e.id === eq.id ? eq : e))
      : [...d.equipment, eq],
  }));

export const deleteEquipment = (eqId: string) =>
  update((d) => ({ ...d, equipment: d.equipment.filter((e) => e.id !== eqId) }));

export const saveEntry = (entry: PlanEntry) =>
  update((d) => ({
    ...d,
    entries: d.entries.some((e) => e.id === entry.id)
      ? d.entries.map((e) => (e.id === entry.id ? entry : e))
      : [...d.entries, entry],
  }));

export const deleteEntry = (entryId: string) =>
  update((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entryId) }));

export const patchEntry = (entryId: string, patch: Partial<PlanEntry>) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
  }));

export const toggleTask = (entryId: string, taskId: string) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            tasks: e.tasks.map((t) =>
              t.id === taskId ? { ...t, done: !t.done } : t,
            ),
          }
        : e,
    ),
  }));

export const patchTask = (
  entryId: string,
  taskId: string,
  patch: Partial<PlanEntry["tasks"][number]>,
) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)),
          }
        : e,
    ),
  }));

export const removeTask = (entryId: string, taskId: string) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) =>
      e.id === entryId
        ? { ...e, tasks: e.tasks.filter((t) => t.id !== taskId) }
        : e,
    ),
  }));

export const patchItem = (
  entryId: string,
  itemId: string,
  patch: Partial<PlanEntry["items"][number]>,
) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) =>
      e.id === entryId
        ? {
            ...e,
            items: e.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          }
        : e,
    ),
  }));

export const removeItem = (entryId: string, itemId: string) =>
  update((d) => ({
    ...d,
    entries: d.entries.map((e) =>
      e.id === entryId
        ? { ...e, items: e.items.filter((i) => i.id !== itemId) }
        : e,
    ),
  }));

export const addNeed = (need: NeedItem) =>
  update((d) => ({ ...d, needs: [...d.needs, need] }));

export const toggleNeed = (needId: string) =>
  update((d) => ({
    ...d,
    needs: d.needs.map((n) => (n.id === needId ? { ...n, done: !n.done } : n)),
  }));

export const removeNeed = (needId: string) =>
  update((d) => ({ ...d, needs: d.needs.filter((n) => n.id !== needId) }));

export function useStable<T extends (...args: never[]) => unknown>(fn: T) {
  return useCallback(fn, [fn]);
}

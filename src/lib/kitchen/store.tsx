import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { buildSeed } from "./seed";
import type {
  Equipment,
  KitchenData,
  Meal,
  Mission,
  NeedItem,
  PlanEntry,
} from "./types";

const KEY = "kitchen-plan-v1";

const emptyData: KitchenData = {
  meals: [],
  missions: [],
  equipment: [],
  entries: [],
  needs: [],
};

let data: KitchenData = emptyData;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

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

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      data = { ...emptyData, ...(JSON.parse(raw) as KitchenData) };
    } else {
      const today = dayKey(new Date());
      data = buildSeed(today, addDays(today, 1));
      persist();
    }
  } catch {
    const today = dayKey(new Date());
    data = buildSeed(today, addDays(today, 1));
  }
  emit();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function update(fn: (d: KitchenData) => KitchenData) {
  data = fn(data);
  persist();
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useKitchen() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    load();
    setReady(true);
  }, []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => data,
    () => emptyData,
  );
  return { data: snapshot, ready };
}

export function useToday() {
  const [today, setToday] = useState(() => dayKey(new Date()));
  useEffect(() => {
    setToday(dayKey(new Date()));
  }, []);
  return today;
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function resetToSamples() {
  const today = dayKey(new Date());
  data = buildSeed(today, addDays(today, 1));
  persist();
  emit();
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

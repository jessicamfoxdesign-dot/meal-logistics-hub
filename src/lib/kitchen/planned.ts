import type { KitchenData, PlanEntry } from "./types";

/** Planned sessions of existing To-do items and chores. */
export const isListEntry = (e: PlanEntry) => e.kind === "todo" || e.kind === "chore";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/**
 * Is this planned session finished? One-off to-dos read their completion
 * from the To-do item itself (single source of truth); repeatable to-dos and
 * chores keep per-session completion on the entry.
 */
export function listEntryDone(d: KitchenData, e: PlanEntry): boolean {
  if (e.kind === "todo") {
    const t = d.todos.find((x) => x.id === e.refId);
    if (t && !t.repeatable) return t.done;
  }
  return !!e.done;
}

/** Sessions to show on Today: dated today, or earlier and still unfinished. */
export function listEntriesForToday(d: KitchenData, today: string) {
  return d.entries.filter(
    (e) =>
      isListEntry(e) &&
      !e.skipped &&
      (e.date === today || (e.date < today && !listEntryDone(d, e))),
  );
}

/**
 * Select a to-do/chore for a day. Never multiplies unfinished copies:
 * an unfinished one-off session is moved; an unfinished carried-forward
 * session of a repeatable/chore is moved; the same item twice on one day
 * is ignored. Finished sessions are never touched.
 */
export function planListItem(
  d: KitchenData,
  kind: "todo" | "chore",
  refId: string,
  date: string,
  today: string,
): { data: KitchenData; entryId: string | null } {
  const title =
    kind === "todo"
      ? d.todos.find((t) => t.id === refId)?.text
      : d.chores.find((c) => c.id === refId)?.name;
  if (title === undefined) return { data: d, entryId: null };
  const mine = d.entries.filter((e) => e.kind === kind && e.refId === refId);
  const sameDay = mine.find((e) => e.date === date && !listEntryDone(d, e));
  if (sameDay) return { data: d, entryId: sameDay.id };
  const oneOff = kind === "todo" && !d.todos.find((t) => t.id === refId)?.repeatable;
  const movable = mine.find((e) => !listEntryDone(d, e) && (oneOff || e.date < today));
  if (movable) {
    return {
      data: { ...d, entries: d.entries.map((e) => (e === movable ? { ...e, date } : e)) },
      entryId: movable.id,
    };
  }
  const entry: PlanEntry = {
    id: newId(),
    date,
    kind,
    refId,
    title,
    notes: "",
    skipped: false,
    items: [],
    tasks: [],
  };
  return { data: { ...d, entries: [...d.entries, entry] }, entryId: entry.id };
}

/** Check or uncheck a planned session, updating its source item. */
export function toggleListEntry(d: KitchenData, entryId: string, today: string): KitchenData {
  const e = d.entries.find((x) => x.id === entryId);
  if (!e || !isListEntry(e)) return d;
  const done = !listEntryDone(d, e);
  if (e.kind === "todo") {
    const t = d.todos.find((x) => x.id === e.refId);
    if (t && !t.repeatable) {
      // One-off: completion lives on the To-do item only.
      return { ...d, todos: d.todos.map((x) => (x === t ? { ...x, done } : x)) };
    }
    return { ...d, entries: d.entries.map((x) => (x === e ? { ...x, done } : x)) };
  }
  // Chore: finishing sets lastDone to today; unchecking restores the previous value.
  const c = d.chores.find((x) => x.id === e.refId);
  const entries = d.entries.map((x) =>
    x === e
      ? done
        ? { ...x, done: true, choreLastDoneBefore: c?.lastDone ?? null }
        : { ...x, done: false, choreLastDoneBefore: undefined }
      : x,
  );
  if (!c) return { ...d, entries };
  const lastDone = done ? today : (e.choreLastDoneBefore ?? undefined);
  return {
    ...d,
    entries,
    chores: d.chores.map((x) => (x === c ? { ...x, lastDone } : x)),
  };
}

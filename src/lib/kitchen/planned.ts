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
  // Chore: finishing sets lastDone to today; unchecking restores the previous
  // value only if nothing newer has set lastDone since.
  const c = d.chores.find((x) => x.id === e.refId);
  const entries = d.entries.map((x) =>
    x === e
      ? done
        ? { ...x, done: true, choreLastDoneBefore: c?.lastDone ?? null, choreLastDoneSet: today }
        : { ...x, done: false, choreLastDoneBefore: undefined, choreLastDoneSet: undefined }
      : x,
  );
  if (!c) return { ...d, entries };
  let lastDone = c.lastDone;
  if (done) lastDone = today;
  else if (canRollBack(d, e, c.lastDone)) lastDone = e.choreLastDoneBefore ?? undefined;
  return {
    ...d,
    entries,
    chores: d.chores.map((x) => (x === c ? { ...x, lastDone } : x)),
  };
}

/** Roll back lastDone only if this session set the current value and no other completed session also relies on it. */
function canRollBack(d: KitchenData, e: PlanEntry, current: string | undefined) {
  if (!e.choreLastDoneSet || e.choreLastDoneSet !== current) return false;
  return !d.entries.some(
    (x) => x !== e && x.kind === "chore" && x.refId === e.refId && x.done && x.choreLastDoneSet === current,
  );
}

/**
 * Done pressed on the Chores page: set lastDone to today and finish any
 * pending planned session (unfinished, dated today or earlier). Future
 * sessions and already-finished sessions are left alone.
 */
export function completeChore(
  d: KitchenData,
  choreId: string,
  today: string,
): { data: KitchenData; sessionIds: string[] } {
  const c = d.chores.find((x) => x.id === choreId);
  if (!c) return { data: d, sessionIds: [] };
  const sessionIds: string[] = [];
  const entries = d.entries.map((x) => {
    if (x.kind !== "chore" || x.refId !== choreId || x.done || x.skipped || x.date > today) return x;
    sessionIds.push(x.id);
    return { ...x, done: true, choreLastDoneBefore: c.lastDone ?? null, choreLastDoneSet: today };
  });
  return {
    data: {
      ...d,
      entries,
      chores: d.chores.map((x) => (x === c ? { ...x, lastDone: today } : x)),
    },
    sessionIds,
  };
}

/** Undo for completeChore: reopen exactly those sessions; restore lastDone only if still the value it set. */
export function undoCompleteChore(
  d: KitchenData,
  choreId: string,
  prev: string | undefined,
  sessionIds: string[],
  today: string,
): KitchenData {
  const ids = new Set(sessionIds);
  const entries = d.entries.map((x) =>
    ids.has(x.id) && x.done
      ? { ...x, done: false, choreLastDoneBefore: undefined, choreLastDoneSet: undefined }
      : x,
  );
  const others = entries.some(
    (x) => x.kind === "chore" && x.refId === choreId && x.done && x.choreLastDoneSet === today,
  );
  return {
    ...d,
    entries,
    chores: d.chores.map((x) =>
      x.id === choreId && x.lastDone === today && !others ? { ...x, lastDone: prev } : x,
    ),
  };
}

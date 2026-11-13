import { describe, test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { chooseListEntry, earlierListEntries, completeChore, undoCompleteChore, listEntriesForToday, listEntryDone, planListItem, toggleListEntry } from "./planned";
import { normalizeData } from "./normalize";
import type { KitchenData } from "./types";

const T = "2026-11-02";
const base = (): KitchenData =>
  normalizeData({
    meals: [],
    missions: [],
    equipment: [],
    entries: [],
    needs: [],
    todos: [
      { id: "once", text: "Call radiology", done: false },
      { id: "rep", text: "Paint", done: false, repeatable: true, group: "Art" },
    ],
    chores: [{ id: "tub", name: "Tub", lastDone: "2026-10-01" }],
  } as unknown as KitchenData);

describe("morning review choices", () => {
  const previous = "2026-11-01";
  const selected = (kind: "todo" | "chore", ref: string) => {
    const r = planListItem(base(), kind, ref, previous, T);
    if (!r.entryId) throw new Error("Selection failed");
    return { data: r.data, id: r.entryId };
  };
  test("multiple missed days aggregate original selections without unselected sources", () => {
    const r = selected("todo", "rep");
    const d = planListItem(r.data, "chore", "tub", "2026-10-28", T).data;
    deepStrictEqual(earlierListEntries(d, "2026-11-13").map(e => [e.refId, e.date]),
      [["tub", "2026-10-28"], ["rep", previous]]);
    strictEqual(earlierListEntries(d, previous).length, 1);
    strictEqual(earlierListEntries(d, T).length, 2);
  });
  test("Today and Defer move the same occurrence and Undo restores its date", () => {
    const r = selected("todo", "rep");
    const moved = chooseListEntry(r.data, r.id, { kind: "move", date: T }, T);
    strictEqual(moved.data.entries.length, 1);
    strictEqual(moved.data.entries[0]?.id, r.id);
    strictEqual(earlierListEntries(moved.data, T).length, 0);
    const deferred = chooseListEntry(moved.data, r.id, { kind: "move", date: "2026-11-09" }, T);
    strictEqual(listEntriesForToday(deferred.data, T).length, 0);
    strictEqual(deferred.undo(deferred.data).entries[0]?.date, T);
    strictEqual(moved.undo(moved.data).entries[0]?.date, previous);
  });
  test("Skip is not Done, leaves future repeatable sessions intact, and supports Undo", () => {
    const r = selected("todo", "rep");
    const d = planListItem(r.data, "todo", "rep", "2026-11-09", previous).data;
    const skipped = chooseListEntry(d, r.id, { kind: "skip" }, T);
    strictEqual(earlierListEntries(skipped.data, T).length, 0);
    strictEqual(listEntryDone(skipped.data, skipped.data.entries[0] as NonNullable<typeof skipped.data.entries[0]>), false);
    strictEqual(skipped.data.todos[1]?.done, false);
    strictEqual(skipped.data.entries[1], d.entries[1]);
    strictEqual(skipped.undo(skipped.data).entries[0]?.skipped, false);
    const again = planListItem(skipped.data, "todo", "rep", T, T).data;
    strictEqual(again.entries.length, 3);
    strictEqual(again.entries[0]?.date, previous);
    strictEqual(again.entries[0]?.skipped, true);
  });
  test("skipping a one-off preserves its source and allows a fresh selection", () => {
    const r = selected("todo", "once");
    const skipped = chooseListEntry(r.data, r.id, { kind: "skip" }, T).data;
    const again = planListItem(skipped, "todo", "once", T, T).data;
    strictEqual(again.todos[0]?.done, false);
    strictEqual(again.entries.length, 2);
    const active = again.entries[1];
    const past = again.entries[0];
    if (!active || !past) throw new Error("Missing occurrences");
    const completed = chooseListEntry(again, active.id, { kind: "done" }, T).data;
    strictEqual(listEntryDone(completed, past), false);
    strictEqual(completed.todos[0]?.done, true);
  });
  test("Done synchronizes one-off sources, but completes only repeatable sessions", () => {
    for (const ref of ["once", "rep"]) {
      const r = selected("todo", ref);
      const done = chooseListEntry(r.data, r.id, { kind: "done" }, T);
      strictEqual(earlierListEntries(done.data, T).length, 0);
      strictEqual(done.data.todos.find(t => t.id === ref)?.done, ref === "once");
      strictEqual(earlierListEntries(done.undo(done.data), T).length, 1);
    }
  });
  test("chore Skip/Undo never changes lastDone or historical completion", () => {
    const r = selected("chore", "tub");
    const skipped = chooseListEntry(r.data, r.id, { kind: "skip" }, T);
    strictEqual(skipped.data.chores[0]?.lastDone, "2026-10-01");
    strictEqual(skipped.undo(skipped.data).chores[0]?.lastDone, "2026-10-01");
    const fromChores = completeChore(skipped.data, "tub", T).data;
    strictEqual(fromChores.entries[0]?.done, undefined);
  });
  test("chore Done updates lastDone and Undo protects newer completion elsewhere", () => {
    const r = selected("chore", "tub");
    const done = chooseListEntry(r.data, r.id, { kind: "done" }, T);
    strictEqual(done.data.chores[0]?.lastDone, T);
    strictEqual(done.undo(done.data).chores[0]?.lastDone, "2026-10-01");
    const newer = completeChore(done.data, "tub", "2026-11-03").data;
    strictEqual(done.undo(newer).chores[0]?.lastDone, "2026-11-03");
    const sameDay = completeChore(done.data, "tub", T).data;
    strictEqual(done.undo(sameDay).chores[0]?.lastDone, T);
    strictEqual(toggleListEntry(sameDay, r.id, T).chores[0]?.lastDone, T);
  });
  test("old persisted entries and all choices survive normalization and JSON reload", () => {
    const r = selected("chore", "tub");
    for (const choice of [{ kind: "skip" }, { kind: "done" }, { kind: "move", date: "2026-11-09" }] as const) {
      const next = chooseListEntry(r.data, r.id, choice, T).data;
      const loaded = normalizeData(JSON.parse(JSON.stringify(next)));
      deepStrictEqual(loaded, next);
      strictEqual(earlierListEntries(loaded, T).length, 0);
    }
    strictEqual(earlierListEntries(normalizeData(JSON.parse(JSON.stringify(r.data))), T).length, 1);
  });
});

describe("planned to-dos and chores", () => {
  test("one-off completion lives on the To-do item", () => {
    const r = planListItem(base(), "todo", "once", T, T);
    const d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.todos[0]!.done, true);
    strictEqual(d.entries[0]!.done, undefined);
    strictEqual(listEntryDone(d, d.entries[0]!), true);
  });
  test("re-planning an unfinished one-off moves it instead of duplicating", () => {
    let d = planListItem(base(), "todo", "once", "2026-11-03", T).data;
    d = planListItem(d, "todo", "once", "2026-11-05", T).data;
    strictEqual(d.entries.length, 1);
    strictEqual(d.entries[0]!.date, "2026-11-05");
  });
  test("repeatable: finishing a session leaves the item open and the session done", () => {
    const r = planListItem(base(), "todo", "rep", "2026-11-01", T);
    let d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.todos[1]!.done, false);
    d = planListItem(d, "todo", "rep", T, T).data;
    strictEqual(d.entries.length, 2);
    strictEqual(d.entries[0]!.done, true);
    // completed earlier session is not carried forward
    deepStrictEqual(
      listEntriesForToday(d, T).map((e) => e.date),
      [T],
    );
  });
  test("unfinished sessions carry forward; unselected items do not appear", () => {
    const d = planListItem(base(), "chore", "tub", "2026-10-30", T).data;
    deepStrictEqual(
      listEntriesForToday(d, T).map((e) => e.refId),
      ["tub"],
    );
    // re-selecting a carried-forward chore moves it rather than copying
    const d2 = planListItem(d, "chore", "tub", T, T).data;
    strictEqual(d2.entries.length, 1);
    strictEqual(d2.entries[0]!.date, T);
  });
  test("checking a planned chore sets lastDone to today; unchecking restores it", () => {
    const r = planListItem(base(), "chore", "tub", T, T);
    let d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.chores[0]!.lastDone, T);
    d = toggleListEntry(d, r.entryId!, T);
    strictEqual(d.chores[0]!.lastDone, "2026-10-01");
  });
});

describe("chore sync between Chores page and Plan", () => {
  const withSessions = () => {
    let d = planListItem(base(), "chore", "tub", "2026-10-20", T).data;
    d = toggleListEntry(d, d.entries[0]!.id, "2026-10-20"); // historical, done
    d = planListItem(d, "chore", "tub", T, T).data; // pending today
    d = planListItem(d, "chore", "tub", "2026-11-09", T).data; // future
    return d;
  };
  test("Done on Chores finishes the pending session only", () => {
    const d0 = withSessions();
    const pendingId = d0.entries.find((e) => e.date === T)!.id;
    const r = completeChore(d0, "tub", T);
    deepStrictEqual(r.sessionIds, [pendingId]);
    strictEqual(r.data.chores[0]!.lastDone, T);
    strictEqual(r.data.entries.find((e) => e.date === T)!.done, true);
    strictEqual(r.data.entries.find((e) => e.date === "2026-11-09")!.done, undefined);
    strictEqual(r.data.entries.find((e) => e.date === "2026-10-20")!.choreLastDoneSet, "2026-10-20");
  });
  test("undo from Chores reopens that session and restores lastDone", () => {
    const d0 = withSessions();
    const r = completeChore(d0, "tub", T);
    const d = undoCompleteChore(r.data, "tub", "2026-10-20", r.sessionIds, T);
    strictEqual(d.chores[0]!.lastDone, "2026-10-20");
    strictEqual(d.entries.find((e) => e.date === T)!.done, false);
    strictEqual(d.entries.find((e) => e.date === "2026-10-20")!.done, true);
  });
  test("unchecking an old session cannot roll back a newer lastDone", () => {
    const d0 = withSessions();
    const d1 = completeChore(d0, "tub", T).data;
    const old = d1.entries.find((e) => e.date === "2026-10-20")!;
    const d = toggleListEntry(d1, old.id, T);
    strictEqual(d.chores[0]!.lastDone, T);
    strictEqual(d.entries.find((e) => e.id === old.id)!.done, false);
  });
  test("unchecking the latest session still restores the previous date", () => {
    const r = planListItem(base(), "chore", "tub", T, T);
    let d = toggleListEntry(r.data, r.entryId!, T);
    d = toggleListEntry(d, r.entryId!, T);
    strictEqual(d.chores[0]!.lastDone, "2026-10-01");
  });
});

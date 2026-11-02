import { describe, test } from "node:test";
import { strictEqual, deepStrictEqual } from "node:assert";
import { listEntriesForToday, listEntryDone, planListItem, toggleListEntry } from "./planned";
import { normalizeData } from "./normalize";
import type { KitchenData } from "./types";

const T = "2026-11-02";
const base = (): KitchenData =>
  normalizeData({
    meals: [], missions: [], equipment: [], entries: [], needs: [],
    todos: [
      { id: "once", text: "Call radiology", done: false },
      { id: "rep", text: "Paint", done: false, repeatable: true, group: "Art" },
    ],
    chores: [{ id: "tub", name: "Tub", lastDone: "2026-10-01" }],
  } as unknown as KitchenData);

describe("planned to-dos and chores", () => {
  test("one-off completion lives on the To-do item", () => {
    const r = planListItem(base(), "todo", "once", T, T);
    const d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.todos[0].done, true);
    strictEqual(d.entries[0].done, undefined);
    strictEqual(listEntryDone(d, d.entries[0]), true);
  });
  test("re-planning an unfinished one-off moves it instead of duplicating", () => {
    let d = planListItem(base(), "todo", "once", "2026-11-03", T).data;
    d = planListItem(d, "todo", "once", "2026-11-05", T).data;
    strictEqual(d.entries.length, 1);
    strictEqual(d.entries[0].date, "2026-11-05");
  });
  test("repeatable: finishing a session leaves the item open and the session done", () => {
    const r = planListItem(base(), "todo", "rep", "2026-11-01", T);
    let d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.todos[1].done, false);
    d = planListItem(d, "todo", "rep", T, T).data;
    strictEqual(d.entries.length, 2);
    strictEqual(d.entries[0].done, true);
    // completed earlier session is not carried forward
    deepStrictEqual(listEntriesForToday(d, T).map((e) => e.date), [T]);
  });
  test("unfinished sessions carry forward; unselected items do not appear", () => {
    const d = planListItem(base(), "chore", "tub", "2026-10-30", T).data;
    deepStrictEqual(listEntriesForToday(d, T).map((e) => e.refId), ["tub"]);
    // re-selecting a carried-forward chore moves it rather than copying
    const d2 = planListItem(d, "chore", "tub", T, T).data;
    strictEqual(d2.entries.length, 1);
    strictEqual(d2.entries[0].date, T);
  });
  test("checking a planned chore sets lastDone to today; unchecking restores it", () => {
    const r = planListItem(base(), "chore", "tub", T, T);
    let d = toggleListEntry(r.data, r.entryId!, T);
    strictEqual(d.chores[0].lastDone, T);
    d = toggleListEntry(d, r.entryId!, T);
    strictEqual(d.chores[0].lastDone, "2026-10-01");
  });
});

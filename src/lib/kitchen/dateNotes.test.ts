import { describe, expect, test } from "bun:test";
import { notesForDate } from "./dateNotes";
import { normalizeData } from "./normalize";
import type { DateNote, KitchenData } from "./types";

const notes: DateNote[] = [
  { id: "birthday", date: "2026-10-28", text: "Bart’s birthday" },
  { id: "appointment", date: "2026-10-30", text: "Bart cardiology, Baltimore" },
  { id: "second", date: "2026-10-28", text: "  Another note\nexactly as written  " },
];

describe("informational date notes", () => {
  test("multiple notes stay on their exact date with text unchanged", () => {
    expect(notesForDate(notes, "2026-10-28")).toEqual([notes[0], notes[2]]);
    expect(notesForDate(notes, "2026-10-30")).toEqual([notes[1]]);
  });
  test("earlier notes do not carry forward onto today", () => {
    expect(notesForDate(notes, "2026-10-31")).toEqual([]);
  });
  test("older data without notes stays compatible", () => {
    const oldData = { meals: [], missions: [], equipment: [], entries: [], needs: [], groceries: [], todos: [], chores: [] };
    expect(normalizeData(oldData as KitchenData).dateNotes).toEqual([]);
  });
  test("notes survive backup serialization without affecting entries", () => {
    const entry = { id: "quiche", date: "2026-10-30", tasks: [{ id: "onions", doDate: "2026-10-29", done: false }] };
    const data = { meals: [], missions: [], entries: [entry], dateNotes: notes };
    const roundTrip = normalizeData(JSON.parse(JSON.stringify(data)) as KitchenData);
    expect(roundTrip.dateNotes).toEqual(notes);
    expect(roundTrip.entries).toEqual([entry]);
  });
});
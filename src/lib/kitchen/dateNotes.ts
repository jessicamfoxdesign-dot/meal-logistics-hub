import type { DateNote } from "./types";

/** Exact date matching only: notes never carry forward or affect scheduling. */
export function notesForDate(notes: DateNote[], date: string) {
  return notes.filter((note) => note.date === date);
}

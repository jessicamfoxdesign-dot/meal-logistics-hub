import { uid } from "./store";
import type { EntryKind, Meal, Mission, PlanEntry } from "./types";

export function entryFromMeal(meal: Meal, date: string): PlanEntry {
  return {
    id: uid(),
    date,
    kind: "meal",
    refId: meal.id,
    title: meal.name,
    notes: [meal.notes, meal.planB ? `Plan B: ${meal.planB}` : ""]
      .filter(Boolean)
      .join("\n"),
    skipped: false,
    items: [
      ...meal.items.map((i) => ({
        id: uid(),
        label: i.label,
        kind: i.kind,
        status: "unset" as const,
        note: "",
      })),
      ...meal.equipment.map((e) => ({
        id: uid(),
        label: e,
        kind: "equipment" as const,
        status: "unset" as const,
        note: "",
      })),
    ],
    tasks: [
      ...meal.prep.map((t) => ({
        id: uid(),
        text: t,
        phase: "prep" as const,
        done: false,
        notes: "",
      })),
      ...meal.cook.map((t) => ({
        id: uid(),
        text: t,
        phase: "cook" as const,
        done: false,
        notes: "",
      })),
    ],
  };
}

export function entryFromMission(mission: Mission, date: string): PlanEntry {
  return {
    id: uid(),
    date,
    kind: "mission",
    refId: mission.id,
    title: mission.name,
    notes: mission.notes,
    skipped: false,
    items: [
      ...mission.items.map((i) => ({
        id: uid(),
        label: i.label,
        kind: i.kind,
        status: "unset" as const,
        note: "",
      })),
      ...mission.equipment.map((e) => ({
        id: uid(),
        label: e,
        kind: "equipment" as const,
        status: "unset" as const,
        note: "",
      })),
    ],
    tasks: [
      ...mission.setup.map((t) => ({
        id: uid(),
        text: t,
        phase: "setup" as const,
        done: false,
        notes: "",
      })),
      ...mission.prep.map((t) => ({
        id: uid(),
        text: t,
        phase: "prep" as const,
        done: false,
        notes: "",
      })),
      ...mission.finish.map((t) => ({
        id: uid(),
        text: t,
        phase: "cook" as const,
        done: false,
        notes: "",
      })),
    ],
  };
}

export function simpleEntry(
  kind: EntryKind,
  title: string,
  date: string,
): PlanEntry {
  return {
    id: uid(),
    date,
    kind,
    title,
    notes: "",
    skipped: false,
    items: [],
    tasks: [],
  };
}

export const emptyMeal = (): Meal => ({
  id: uid(),
  name: "",
  notes: "",
  planB: "",
  archived: false,
  items: [],
  equipment: [],
  prep: [],
  cook: [],
});

export const emptyMission = (): Mission => ({
  id: uid(),
  name: "",
  notes: "",
  archived: false,
  items: [],
  equipment: [],
  setup: [],
  prep: [],
  finish: [],
});

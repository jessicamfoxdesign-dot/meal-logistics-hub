import { addDays, uid } from "./store";
import type { EntryKind, Meal, Mission, Phase, PlanEntry, PlanTask, TemplateStep } from "./types";

/** Turn template steps into plan tasks, placing each on (entry date - daysAhead). */
export function tasksFromSteps(steps: TemplateStep[], phase: Phase, date: string): PlanTask[] {
  return steps.map((s) => {
    const t: PlanTask = { id: uid(), text: s.text, phase, done: false, notes: "" };
    if (s.keeps?.trim()) t.keeps = s.keeps.trim();
    if (s.daysAhead > 0) t.doDate = addDays(date, -s.daysAhead);
    return t;
  });
}

export const newStep = (text = ""): TemplateStep => ({ id: uid(), text, daysAhead: 0, keeps: "" });

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
      ...tasksFromSteps(meal.prep, "prep", date),
      ...tasksFromSteps(meal.cook, "cook", date),
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
      ...tasksFromSteps(mission.setup, "setup", date),
      ...tasksFromSteps(mission.prep, "prep", date),
      ...tasksFromSteps(mission.finish, "cook", date),
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

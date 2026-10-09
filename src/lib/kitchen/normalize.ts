import type { KitchenData, Meal, Mission, TemplateStep } from "./types";

/**
 * Older data stored template steps as plain strings. Convert those (and any
 * malformed step objects) to TemplateStep with daysAhead 0. Never drops a step.
 */
function toSteps(value: unknown, prefix: string): TemplateStep[] {
  if (!Array.isArray(value)) return [];
  return value.map((v, i) => {
    if (typeof v === "string") return { id: `${prefix}-${i}`, text: v, daysAhead: 0 };
    const o = (v ?? {}) as Partial<TemplateStep>;
    const days = Number(o.daysAhead);
    return {
      id: typeof o.id === "string" && o.id ? o.id : `${prefix}-${i}`,
      text: typeof o.text === "string" ? o.text : String(o.text ?? ""),
      daysAhead: Number.isFinite(days) && days > 0 ? Math.round(days) : 0,
      ...(typeof o.keeps === "string" && o.keeps ? { keeps: o.keeps } : {}),
    };
  });
}

function sameSteps(a: unknown, b: TemplateStep[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function normalizeMeal(m: Meal): Meal {
  const prep = toSteps(m.prep, `${m.id}-prep`);
  const cook = toSteps(m.cook, `${m.id}-cook`);
  if (sameSteps(m.prep, prep) && sameSteps(m.cook, cook)) return m;
  return { ...m, prep, cook };
}

export function normalizeMission(m: Mission): Mission {
  const setup = toSteps(m.setup, `${m.id}-setup`);
  const prep = toSteps(m.prep, `${m.id}-prep`);
  const finish = toSteps(m.finish, `${m.id}-finish`);
  if (sameSteps(m.setup, setup) && sameSteps(m.prep, prep) && sameSteps(m.finish, finish))
    return m;
  return { ...m, setup, prep, finish };
}

export function normalizeData(d: KitchenData): KitchenData {
  return {
    ...d,
    meals: (d.meals ?? []).map(normalizeMeal),
    missions: (d.missions ?? []).map(normalizeMission),
    groceries: d.groceries ?? [],
    todos: d.todos ?? [],
    chores: d.chores ?? [],
  };
}

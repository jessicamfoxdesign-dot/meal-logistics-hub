export type ItemKind = "component" | "ingredient" | "equipment";

export type ItemStatus =
  | "unset"
  | "on-hand"
  | "make"
  | "buy"
  | "substitute"
  | "optional"
  | "attention";

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  unset: "Not checked",
  "on-hand": "On hand",
  make: "Need to make",
  buy: "Need to buy",
  substitute: "Substitute",
  optional: "Optional",
  attention: "Needs attention",
};

export type Phase = "preflight" | "prep" | "cook" | "setup";

export const PHASE_LABEL: Record<Phase, string> = {
  preflight: "Preflight",
  setup: "Setup ahead",
  prep: "Prep / do ahead",
  cook: "Cook / finish",
};

export interface TemplateItem {
  id: string;
  label: string;
  kind: ItemKind;
}

export interface TemplateStep {
  id: string;
  text: string;
  /** 0 = day of, 1 = the day before, 7 = a week before */
  daysAhead: number;
  /** Free text, e.g. "keeps a week" */
  keeps?: string;
}

export const DAYS_AHEAD_OPTIONS = [0, 1, 2, 3, 4, 5, 7];

export function daysAheadLabel(n: number) {
  if (n <= 0) return "Day of";
  if (n === 7) return "A week before";
  return n === 1 ? "1 day before" : `${n} days before`;
}

export interface Meal {
  id: string;
  name: string;
  notes: string;
  planB: string;
  archived: boolean;
  items: TemplateItem[];
  equipment: string[];
  prep: TemplateStep[];
  cook: TemplateStep[];
}

export interface Mission {
  id: string;
  name: string;
  notes: string;
  archived: boolean;
  items: TemplateItem[];
  equipment: string[];
  setup: TemplateStep[];
  prep: TemplateStep[];
  finish: TemplateStep[];
}

export type EquipmentCategory = "everyday" | "staged" | "stored";

export const EQUIPMENT_CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  everyday: "Everyday",
  staged: "Staged / accessible",
  stored: "Stored specialty",
};

export interface Equipment {
  id: string;
  name: string;
  location: string;
  notes: string;
  category: EquipmentCategory;
  helpNeeded: boolean;
  cleanFirst: boolean;
  related: string[];
}

export interface PlanItem {
  id: string;
  label: string;
  kind: ItemKind;
  status: ItemStatus;
  note: string;
  /** Hidden because this occurrence is already prepared. */
  setAside?: boolean;
}

export interface PlanTask {
  id: string;
  text: string;
  phase: Phase;
  done: boolean;
  notes: string;
  /** Copied from the template step, e.g. "keeps a week". */
  keeps?: string;
  /** If set, the task shows up on this day instead of the entry's day. */
  doDate?: string;
  /** Hidden because this occurrence is already prepared. */
  setAside?: boolean;
  /** Added automatically when the entry was marked already prepared. */
  forPrepared?: boolean;
}

export type EntryKind =
  | "meal"
  | "mission"
  | "leftovers"
  | "takeout"
  | "open"
  | "other";

export interface PlanEntry {
  id: string;
  date: string; // yyyy-MM-dd
  kind: EntryKind;
  refId?: string;
  title: string;
  notes: string;
  skipped: boolean;
  /** This occurrence is already cooked / from the freezer. */
  prepared?: boolean;
  /** The user marked this occurrence finished. */
  done?: boolean;
  items: PlanItem[];
  tasks: PlanTask[];
}

export interface NeedItem {
  id: string;
  text: string;
  done: boolean;
  sourceEntryId?: string;
  sourceLabel?: string;
}

export type GroceryCategory =
  | "produce"
  | "bakery"
  | "meat"
  | "dairy"
  | "frozen"
  | "pantry"
  | "household"
  | "other";

export interface GroceryItem {
  id: string;
  text: string;
  done: boolean;
  /** User-corrected department; when absent it's inferred from the text. */
  category?: GroceryCategory;
}

export interface KitchenData {
  meals: Meal[];
  missions: Mission[];
  equipment: Equipment[];
  entries: PlanEntry[];
  needs: NeedItem[];
  groceries: GroceryItem[];
}

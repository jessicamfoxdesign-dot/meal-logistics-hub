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

export interface Meal {
  id: string;
  name: string;
  notes: string;
  planB: string;
  archived: boolean;
  items: TemplateItem[];
  equipment: string[];
  prep: string[];
  cook: string[];
}

export interface Mission {
  id: string;
  name: string;
  notes: string;
  archived: boolean;
  items: TemplateItem[];
  equipment: string[];
  setup: string[];
  prep: string[];
  finish: string[];
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
}

export interface PlanTask {
  id: string;
  text: string;
  phase: Phase;
  done: boolean;
  notes: string;
  /** If set, the task shows up on this day instead of the entry's day. */
  doDate?: string;
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

export interface KitchenData {
  meals: Meal[];
  missions: Mission[];
  equipment: Equipment[];
  entries: PlanEntry[];
  needs: NeedItem[];
}

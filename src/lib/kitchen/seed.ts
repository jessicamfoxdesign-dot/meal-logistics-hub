import type { KitchenData, TemplateItem, TemplateStep } from "./types";

type StepSpec = string | [string, number, string?];

let n = 0;
const id = (p: string) => `${p}-${++n}`;

const items = (kind: TemplateItem["kind"], labels: string[]): TemplateItem[] =>
  labels.map((label) => ({ id: id("ti"), label, kind }));

const steps = (specs: StepSpec[]): TemplateStep[] =>
  specs.map((sp) => {
    const [text, daysAhead, keeps] = typeof sp === "string" ? [sp, 0, undefined] : sp;
    return { id: id("st"), text, daysAhead, ...(keeps ? { keeps } : {}) };
  });

function shift(key: string, n: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, "0")}-${`${dt.getDate()}`.padStart(2, "0")}`;
}

export function buildSeed(today: string, tomorrow: string): KitchenData {
  const meatloaf = {
    id: "meal-meatloaf",
    name: "Meatloaf + potatoes + green beans",
    notes: "The usual weeknight version.",
    planB: "",
    archived: false,
    items: [
      ...items("ingredient", [
        "Ground beef — check date first",
        "Potatoes",
        "Green beans",
        "Pepper + onion",
        "Chipotle BBQ glaze ingredients",
        "Usual meatloaf binders / seasonings",
      ]),
    ],
    equipment: ["Loaf pan or sheet pan", "Mini food processor"],
    prep: steps([
      "Dice pepper and onion",
      "Make chipotle BBQ glaze",
      "Prep green beans",
      "Mix everything except the ground beef",
    ]),
    cook: steps([
      "Add ground beef to prepared mixture (final raw-meat stage)",
      "Shape, glaze, bake",
      "Potatoes",
      "Finish green beans",
    ]),
  };

  const enchiladas = {
    id: "meal-enchiladas",
    name: "Enchiladas",
    notes: "Usually built on leftover taco filling.",
    planB: "",
    archived: false,
    items: [
      ...items("component", [
        "Leftover taco meat / filling",
        "Beans",
        "Tortillas",
        "Cheese",
        "Enchilada sauce",
        "Optional toppings",
      ]),
    ],
    equipment: ["Baking dish"],
    prep: steps(["Shred / portion cheese", "Warm tortillas so they roll"]),
    cook: steps(["Assemble", "Bake", "Set out toppings"]),
  };

  const soup = {
    id: "meal-soup",
    name: "Simple soup night",
    notes: "Low-effort fallback meal.",
    planB: "",
    archived: false,
    items: [...items("ingredient", ["Stock", "Vegetables", "Bread"])],
    equipment: ["Instant Pot"],
    prep: steps(["Rough-chop vegetables"]),
    cook: steps(["Simmer", "Warm bread"]),
  };

  const quiche = {
    id: "meal-quiche",
    name: "Quiche",
    notes: "Split across three days so no single session is long.",
    planB: "",
    archived: false,
    items: [
      ...items("ingredient", ["Flour + butter for pastry", "Onions", "Eggs", "Cream / milk", "Cheese"]),
    ],
    equipment: ["General-purpose food processor", "Tart / pie pan", "Pie weights"],
    prep: steps([
      ["Make pastry in the food processor and chill", 2, "keeps 2 days"],
      ["Caramelize onions", 2, "keeps a week"],
      ["Roll, shape and blind bake the shell", 1, "keeps a day, covered"],
    ]),
    cook: steps(["Mix custard", "Fill and final bake"]),
  };

  const waffles = {
    id: "mission-waffles",
    name: "Waffles",
    notes: "",
    archived: false,
    items: [...items("ingredient", ["Syrup", "Buttermilk", "Toppings"])],
    equipment: ["Waffle maker"],
    setup: steps(["Retrieve waffle maker", "Clean / check waffle maker"]),
    prep: steps(["Check syrup and buttermilk"]),
    finish: steps(["Make waffle batter", "Cook waffles"]),
  };

  const tortillas = {
    id: "mission-tortillas",
    name: "Homemade tortillas",
    notes: "",
    archived: false,
    items: [...items("ingredient", ["Masa", "Press liners / accessories"])],
    equipment: ["Tortilla press"],
    setup: steps([
      ["Retrieve tortilla press", 2],
      ["Clean and dry press", 1],
      ["Check masa and liners", 1],
    ]),
    prep: steps(["Mix dough", "Rest dough"]),
    finish: steps(["Press tortillas", "Cook tortillas"]),
  };

  const icecream = {
    id: "mission-icecream",
    name: "Make ice cream",
    notes: "Machine is very heavy — ask for help early.",
    archived: false,
    items: [...items("ingredient", ["Cream", "Mix-ins"])],
    equipment: ["Ice cream maker"],
    setup: steps([
      "Ask Bart to retrieve the ice cream maker (heavy)",
      "Freeze the bowl the night before",
    ]),
    prep: steps(["Make base", "Chill base"]),
    finish: steps(["Churn", "Transfer to freezer container"]),
  };

  const equipment = [
    ["KitchenAid stand mixer", "Counter", "everyday", false, false],
    ["General-purpose food processor", "Lower cabinet", "staged", false, false],
    ["Mini food processor", "Lower cabinet", "staged", false, true],
    [
      "Hot sauce / salsa food processor",
      "Lower cabinet",
      "staged",
      false,
      true,
    ],
    ["Instant Pot", "Pantry shelf", "staged", false, false],
    ["Ice cream maker", "High shelf, garage", "stored", true, true],
    ["Immersion circulator", "Drawer", "staged", false, false],
    ["Tortilla press", "Upper cabinet", "stored", false, true],
    ["Spaetzle maker", "Upper cabinet", "stored", false, true],
    ["Specialty baking pans", "Upper cabinet", "stored", false, false],
    ["Waffle maker", "Upper cabinet", "stored", false, true],
  ].map(([name, location, category, helpNeeded, cleanFirst]) => ({
    id: id("eq"),
    name: name as string,
    location: location as string,
    notes: "",
    category: category as "everyday" | "staged" | "stored",
    helpNeeded: helpNeeded as boolean,
    cleanFirst: cleanFirst as boolean,
    related: [] as string[],
  }));

  const entryFromMeal = (
    meal: typeof meatloaf,
    date: string,
    statuses: Record<string, string> = {},
  ) => ({
    id: id("entry"),
    date,
    kind: "meal" as const,
    refId: meal.id,
    title: meal.name,
    notes: "",
    skipped: false,
    items: meal.items.map((i) => ({
      id: id("pi"),
      label: i.label,
      kind: i.kind,
      status: (statuses[i.label] ?? "unset") as never,
      note: "",
    })),
    tasks: [
      ...(["prep", "cook"] as const).flatMap((phase) =>
        meal[phase].map((t) => ({
          id: id("pt"),
          text: t.text,
          phase,
          done: false,
          notes: "",
          ...(t.keeps ? { keeps: t.keeps } : {}),
          ...(t.daysAhead > 0 ? { doDate: shift(date, -t.daysAhead) } : {}),
        })),
      ),
    ],
  });

  const meatloafEntry = entryFromMeal(meatloaf, today, {
    "Potatoes": "on-hand",
    "Green beans": "on-hand",
    "Ground beef — check date first": "attention",
  });
  meatloafEntry.notes = "Check the beef date before starting vegetable prep.";

  const enchiladaEntry = entryFromMeal(enchiladas as typeof meatloaf, tomorrow, {
    "Enchilada sauce": "attention",
    "Cheese": "on-hand",
    "Beans": "on-hand",
  });

  const quicheEntry = entryFromMeal(quiche as typeof meatloaf, shift(today, 2));

  const waffleEntry = {
    id: id("entry"),
    date: tomorrow,
    kind: "mission" as const,
    refId: waffles.id,
    title: waffles.name,
    notes: "",
    skipped: false,
    items: waffles.items.map((i) => ({
      id: id("pi"),
      label: i.label,
      kind: i.kind,
      status: "unset" as never,
      note: "",
    })),
    tasks: [
      {
        id: id("pt"),
        text: "Retrieve waffle maker",
        phase: "setup" as const,
        done: false,
        notes: "",
        doDate: today,
      },
      {
        id: id("pt"),
        text: "Clean / check waffle maker",
        phase: "setup" as const,
        done: false,
        notes: "",
        doDate: today,
      },
      {
        id: id("pt"),
        text: "Make waffle batter",
        phase: "cook" as const,
        done: false,
        notes: "",
      },
      {
        id: id("pt"),
        text: "Cook waffles",
        phase: "cook" as const,
        done: false,
        notes: "",
      },
    ],
  };

  return {
    meals: [meatloaf, enchiladas as typeof meatloaf, quiche as typeof meatloaf, soup as typeof meatloaf],
    missions: [waffles, tortillas, icecream],
    equipment,
    entries: [meatloafEntry, enchiladaEntry, waffleEntry, quicheEntry],
    needs: [
      { id: id("need"), text: "Enchilada sauce", done: false, sourceLabel: "Enchiladas" },
    ],
    groceries: [],
    todos: [],
    chores: [],
  } as KitchenData;
}

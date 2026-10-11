# Kitchen Compass

Build a simple personal meal-planning and kitchen-logistics web app. This is NOT a recipe app, nutrition app, calorie tracker, cooking tutorial, or AI cooking-advice app. The user already knows how to cook. The purpose is to prevent forgotten ingredients, missing equipment, unanticipated setup work, and last-minute tasks from derailing dinner when the user's physical capacity varies unpredictably day to day.

Core design principle: the software serves the user; the user does not perform for the software. No streaks, completion percentages, guilt, wellness scores, difficulty ratings, nutrition scores, calorie counts, recipe recommendations, or unsolicited cooking instructions.

V1 should be mobile/tablet friendly but also pleasant on desktop, with a calm, clean, practical interface and large easy tap targets. Use persistent storage so plans and custom meals survive reloads. No authentication needed for V1 unless required by the default stack.

CORE CONCEPTS

1. MEALS
A personal library of meals the user already makes. A meal is not necessarily a formal recipe. It can contain:
- name
- optional notes
- components/checklist (e.g. enchiladas: filling, beans, tortillas, cheese, enchilada sauce, optional toppings)
- ingredients/items to verify
- equipment needed
- prep tasks that can be done ahead
- final/cook-time tasks
- optional Plan B note
Allow easy create, edit, duplicate, archive, and reuse. Do not generate cooking directions.

2. PREFLIGHT
The most important concept. When a meal is placed on the plan, allow an early preflight check before the user is committed. Each required item/component can be marked On hand, Need to make, Need to buy, Substitute, Optional, or Missing/needs attention. Make missing items visually obvious but not alarming. A preflight can create a prep task or shopping-list item.
Example: Enchiladas preflight should reveal that enchilada sauce is missing at 10 AM, not at dinner time.
Example: Meatloaf should include an early task to check the ground beef/date before doing vegetable prep and glaze.

3. THREE PHASES
Organize a planned meal around three flexible sections:
- Preflight: verify ingredients/components/equipment, thaw/check perishables, identify anything missing.
- Prep: user-defined tasks that can happen earlier, e.g. dice peppers/onions, make chipotle BBQ glaze, prep green beans.
- Cook/Finish: the irreducible dinner-time tasks.
These are user-authored checklists, not instructional recipe steps.

4. MISSIONS / PROJECTS
Separate concept for foods or kitchen projects with advance logistics, e.g. Make waffles, Homemade tortillas, Make ice cream, Make spaetzle, Bake bread, Batch peppers for freezer, Make stock. A mission can have setup/retrieval tasks, prep tasks, finish/cook tasks, equipment, and notes. Missions may be scheduled independently or attached to a meal.
Examples:
- Homemade tortillas: retrieve tortilla press, clean/dry it, check masa, then later make/press/cook tortillas.
- Waffles: retrieve/clean waffle maker in advance, check syrup/buttermilk, then make waffles later.
- Ice cream: equipment may require another person's help to retrieve because the machine is very heavy.

5. EQUIPMENT INVENTORY
Inventory kitchen equipment with:
- name
- location
- optional notes
- category: everyday / staged-accessible / stored-specialty
- flag: Help needed to retrieve
- flag: Clean/check before use
- related meals/missions
Do NOT track elaborate equipment status workflows in V1.
Seed sample equipment based on the user's real kitchen: KitchenAid stand mixer; general-purpose food processor; mini food processor; dedicated hot-sauce/salsa food processor; Instant Pot; ice cream maker (help needed to retrieve, heavy); immersion circulator; tortilla press; spaetzle maker; specialty baking pans; waffle maker. These samples must be editable/deletable.

6. WEEKLY / MULTI-DAY PLAN
A simple 7-day dinner-oriented plan. Meals and missions can be assigned to days and moved easily. Support leftovers, takeout, unplanned/open, and skipped/not today. Moving or skipping something must retain its preparation data and never punish the user. Easy drag/drop if reliable, but also provide accessible Move controls.

7. TODAY VIEW
This should be the primary home screen. Show:
- today's planned dinner
- outstanding Preflight items
- Do Ahead / Prep tasks
- Cook/Finish tasks
- any tasks today that prepare for tomorrow or later (e.g. retrieve waffle maker, thaw/check meat, ask Bart to retrieve ice cream maker)
- upcoming tomorrow preview
Allow check-off, edit, defer, move, or mark Not Today quickly.

8. SHOPPING / NEEDS LIST
Very lightweight list populated manually or from preflight items marked Need to buy. No grocery integrations. Items can be checked off or returned to the related meal/preflight.

9. NOTES
Allow freeform notes on meals, missions, equipment, planned meals, and tasks because real life will not fit a rigid schema.

ACCESSIBILITY / WORKFLOW PHILOSOPHY
Do not ask the user to rate daily energy or difficulty. Capacity changes too much and the user knows whether something is feasible. The app's job is organization and early warning, not deciding what the user can do.
Do not classify tasks as seated vs standing unless the user later asks for that feature.
A useful exception is equipment that requires help to retrieve, especially heavy or ladder-access items. Surface those retrieval requests early.

SEED REAL EXAMPLES
Include editable sample data demonstrating the system:
A) Meatloaf + potatoes + green beans
Preflight: check ground beef/date; potatoes on hand; green beans on hand; verify other usual ingredients.
Prep: dice pepper/onion; make chipotle BBQ glaze; prep green beans.
Cook/Finish: add ground beef to prepared mixture only at final raw-meat stage; shape/glaze/bake; finish sides.
Plan B note: user-editable placeholder, no suggestion from app.

B) Enchiladas
Preflight: leftover taco meat/filling; beans; tortillas; cheese; enchilada sauce; optional toppings.
If sauce is missing, user can mark Need to make, Need to buy, Substitute, or change dinner.
Do not teach how to make enchilada sauce.

C) Waffles mission
Setup ahead: retrieve waffle maker; clean/check if needed; check desired ingredients/toppings.
Finish: user-authored waffle tasks.

D) Homemade tortillas mission
Setup ahead: retrieve tortilla press; clean/dry; check masa and needed accessories.
Prep/finish placeholders only; no cooking lesson.

E) Make ice cream mission
Equipment: ice cream maker; prominently surface Help needed to retrieve.

VISUAL DESIGN
Warm but restrained, more like a personal household planning tool than a commercial wellness app. Avoid food stock-photo clutter. Clear hierarchy, cards/checklists, generous spacing, readable typography, large controls. The Today view should feel calm even when several tasks remain. Missing/preflight attention items should be visible without red emergency styling. Include a simple navigation structure: Today, Plan, Meals, Missions, Equipment, Needs.

Important: Do not add AI recipe generation, nutritional analysis, cooking advice, gamification, or generic meal suggestions. Build the functional V1 now with sample data and persistent storage.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://meal-logistics-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/95d62f4b-120f-423b-96b8-9b94eb0934a8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

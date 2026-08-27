# hungryvar

Personal meal planning + grocery app for one user (Zoravar). React + Vite frontend,
Supabase database, Gemini chat via a Vercel serverless function, deployed on Vercel.

## Run it

```bash
npm install
npm run dev          # frontend only — /api/chat will 404
vercel dev           # frontend + the chat function (needs `npm i -g vercel`)
```

Environment variables (`.env` locally, Vercel dashboard in production):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — safe in the frontend
- `GEMINI_API_KEY` — server-side only, never expose it to the browser

## Who it's for

19M, 185cm, ~72.5kg, trains 5x/week, wants a lean athletic build. Targets are
derived, not hardcoded: ~2440 kcal, ~174g protein, high potassium, moderate sodium.
Cooks fresh in a shared uni kitchen in London, ≤30 min, hates reheating leftovers.
Budget £65/week. Big foodie — plans must not be bland or repetitive.

Whey is a standalone shake, never mixed into food. Creatine daily (no calories).
Dislikes corn. Has fruit after dinner most nights to manage sweet cravings.

## Architecture

```
src/lib/macroEngine.js         Mifflin-St Jeor targets + analyseDay()
src/lib/foodDatabase.js        ingredients, macros, prices, purchase units,
                               kitchen measurements, shopping guidance
src/lib/mealPlanner.js         meal templates + week generation
src/lib/groceryListGenerator.js  derives the shop from the plan
src/lib/recipes.js             method + technique notes per template
src/lib/store.js               every Supabase read/write, with in-memory fallback
src/lib/assistant.js           AI prompt + action parsing
src/lib/weeks.js               Mon–Sun week maths
src/App.jsx                    all UI (mobile-first, bottom tab bar)
api/chat.js                    Gemini proxy, keeps the key server-side
supabase_schema.sql            run in Supabase SQL editor
```

## How the planner works

`generateWeek(targets, budgetCap, attempts, options)` generates many candidate
weeks and scores them, then returns the best one that fits the budget. Scoring
penalises: going over budget (heavily), missing macro targets, repeated meals,
and using too many distinct ingredients.

`options` accepts:
- `pins` — standing rules, e.g. burgers every Friday
- `favour` — cravings/cuisine preferences
- `blocked` — templates containing disliked ingredients

**Order matters.** Meals are selected, then `enforceBudget` swaps expensive ones,
then top-up and trim passes adjust portions, then pins are re-asserted. Several
bugs came from passes downstream quietly undoing earlier work — if you add a pass,
check `pins` and `blocked` survive it.

## Invariants — these must always hold

1. The grocery list is DERIVED from the week's meals. An ingredient can never be
   used in a meal without appearing on the list.
2. Never exceed the budget cap. Prefer a slightly worse week that fits.
3. Never plan a disliked ingredient — including via budget swaps and fallbacks.
4. Standing rules survive budget optimisation.
5. Breakfasts stay ≤10 minutes.
6. Whey is never an ingredient in a dish.
7. Macro tracking counts what was ACTUALLY logged, starting from zero each day.
   Never show planned totals as if they were consumed.
8. Quantities shown to the user are kitchen-friendly (cups, slices, whole items),
   never raw grams alone.

## Validating changes

There's no test suite. Write a throwaway script and run many weeks:

```js
// check.mjs — run with `node check.mjs`
import { calculateTargets } from "./src/lib/macroEngine.js";
import { generateWeek, excludeDisliked, interpretRules } from "./src/lib/mealPlanner.js";
import { buildGroceryList } from "./src/lib/groceryListGenerator.js";

const tg = calculateTargets({ age:19, height_cm:185, weight_kg:72.5, sex:"male", training_days:5, goal:"mild_cut" });
for (let i = 0; i < 100; i++) {
  const w = generateWeek(tg, 65);
  const g = buildGroceryList(w);
  if (g.estimatedTotal > 65) console.log("over budget", g.estimatedTotal);
  // ...assert the invariants above
}
```

100+ iterations is the bar. Randomised generation hides bugs at low sample sizes —
several issues here only appeared 3 times in 40 runs.

## Known state

Validated clean over 100+ weeks: budget, dislikes, standing rules, ingredient
coverage, breakfast time limits, protein floors.

## Still on the list

- Pantry should notice ingredients going unused after eating out and roll them
  into next week rather than letting them go off
- Ninja Creami recipes if that gets bought
- Cravings currently clear after one plan — check that feels right in practice

## Working style

He can't code and doesn't want to. Explain changes in plain terms, not diffs.
He's good at catching real bugs from using the app — take those reports seriously,
they've been right every time. Don't claim something works without running it.

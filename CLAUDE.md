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
Budget is set in Settings (£68 works at current offers, £72 at shelf prices).
Cooks ~90% of meals and eats out 1-2 times a week, so the plan covers 19-20 of
21 meals: the open slots are set in Settings (`eat_out`, default Sat dinner and
Wed lunch). Induction hob, numbered 1-9. Big foodie — lunches and dinners must
vary. Breakfast is the same granola bowl most days, by his choice.
Shops on Ocado. Buys no fresh fruit or veg: frozen and tinned only. Often has
no time to cook, so the library leans on assembly and microwave meals.
Microwave rice pouches only, never dry rice. Jason's sourdough for toast and
sandwiches. No tinned fish of any kind.

Whey is a standalone shake, never mixed into food. Creatine daily (no calories).
Dislikes corn. Fruit once or twice a week, not daily (`FRUIT_PER_WEEK`).

## Architecture

```
src/lib/macroEngine.js         Mifflin-St Jeor targets + analyseDay()
src/lib/foodDatabase.js        ingredients, macros, `products` (his real Ocado
                               packs and prices), pack picking, staple costing,
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

Meal choice is weighted by **marginal cost**: what a meal adds to the week
given the packs already planned (`weekCostOf`). The second burger from a
4-pack is nearly free, so the planner reuses opened packs. Quick meals are
weighted up. Each template has `max` uses per week (granola bowl 7, burgers 4,
default 2).

Two totals come out of `buildGroceryList`: `estimatedTotal` is the till price
of this shop (whole packs), `weeklyCost` spreads cupboard and frozen staples
over the weeks they last. **The budget cap is measured on `weeklyCost`.**

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
8. The list buys whole packs and never less than the meals use (3% slack on
   weighed items).
9. Quantities shown to the user are kitchen-friendly (cups, slices, whole items),
   never raw grams alone.
10. Nothing is planned past its date. Week day 0 is delivery day; a product's
    `life` comes from Ocado's "Life Xd+" or from him. Non-freezable things
    (diced sweet potato, sourdough) never land after `life`; freezable ones
    (chicken, burgers, buns, naan) can, and the list says what to freeze.
    Packs with `opened` days are bought again if uses spread wider than that.
    `fitsDay` is the check every pass that moves meals must use.
11. At most `FRUIT_PER_WEEK` meals with fruit in them, across all slots.
12. Eating-out slots (`options.out`, meal `eatOut: true`) stay open through every
    pass: no swap, trim, rebalance or craving may fill one, and they beat a
    standing rule for the same slot. That day's targets come from `dayTargets`,
    which removes the share the missing meal normally carries.
13. Swaps keep at least 3 different lunches and dinners when any affordable
    option does; a swap that repeats a meal is the fallback, not the default.

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

Today `npm run check` runs that matrix (default £68): `CAP=72`, `ANCHOR=2026-09-22`,
`DISLIKES=corn,avocado` and `PRICES=regular` (shelf prices, offers ended) are
the variants. 100+ iterations is the bar. Randomised generation hides bugs at low sample sizes —
several issues here only appeared 3 times in 40 runs.

## Things that broke the live app (Nov 2026), now guarded

- A paused Supabase project answers token refreshes with 540, which auth-js
  treated as a dead session and deleted. `authFetch` in store.js turns auth
  5xx/408/429 into network errors. A daily Vercel cron (`api/keepalive.js`)
  keeps the free project from pausing at all.
- Root shows the sign-in form only when no session is saved on the device
  (`hasSavedSession`). Saved-but-unreachable gets a retrying screen.
- `boot()` must work out the week from the profile and shop history it has
  just loaded, never from state: reading state there used the first render's
  anchor and saved a new plan on most launches. A failed boot writes nothing.
- The assistant has its own busy flag (`thinking`), so it can never grey out
  the planner. Model chain and test results are in api/chat.js.

## Hob settings

Recipe steps write `{key}` where a heat setting goes; `HOB` in recipes.js has
the label and starting level. These are estimates. His corrections live in
`hob_overrides` and apply per technique across all recipes.

## Known state

Re-anchored to real Ocado orders in Nov 2026. With his constraints (pouches,
fruit twice a week, no tinned fish, granola at a box a week) the lowest cap
that hits 2443 kcal and 174g protein in ~90% of weeks is £68 at current
offers and £72 at shelf prices (Estate Dairy and Warburtons buns are on
offer). Below ~£64 it falls off a cliff. Plans land at ~98% of calories by
design: the top-up stops at 98%.

The old ~200 kcal gap had three causes, now fixed: the top-up stopped at 92%,
several meals had nothing to scale, and the only fillers were pouches and
granola. Sourdough, milk and peanut butter (~0.2p/kcal) are now fillers, and
the top-up runs after every trim so swapped days get it too.

Nutrition at £68: ~31g fibre, ~3,080mg potassium, ~5 portions of fruit and
veg a day. Saturated fat ~33g, above the ~30g guideline, mostly from the 10%
yoghurt he's chosen to keep.

## Still on the list

- Pantry should notice ingredients going unused after eating out and roll them
  into next week rather than letting them go off
- Ninja Creami recipes if that gets bought
- Cravings currently clear after one plan — check that feels right in practice

## Working style

He can't code and doesn't want to. Explain changes in plain terms, not diffs.
He's good at catching real bugs from using the app — take those reports seriously,
they've been right every time. Don't claim something works without running it.

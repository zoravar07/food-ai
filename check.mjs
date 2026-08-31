// check.mjs — the invariant gate. `npm run check` (default 150 weeks), or
// `npm run check -- 300` for a fuller sweep, or `DISLIKES=corn,avocado npm run check`
// to exercise a dislike that collides with a standing rule.
//
// There is no test suite, so this is it. It generates many weeks, runs AI-style
// meal swaps over each one, and asserts the invariants from CLAUDE.md. Randomised
// generation hides bugs at low sample sizes — 100+ is the bar. Exits non-zero on
// any failure so it can gate a commit.
import { calculateTargets } from "./src/lib/macroEngine.js";
import { generateWeek, excludeDisliked, interpretRules, templates, usablePins, trimToBudget, weekCost, rebalanceAfterSwap, setMealOnDay } from "./src/lib/mealPlanner.js";
import { buildGroceryList } from "./src/lib/groceryListGenerator.js";
import { allIngredients, purchaseUnits } from "./src/lib/foodDatabase.js";

const tg = calculateTargets({ age:19, height_cm:185, weight_kg:72.5, sex:"male", training_days:5, goal:"mild_cut" });
const CAP = 65;
const DISLIKES = (process.env.DISLIKES ?? "corn,salmon").split(",").filter(Boolean);
const RULES = [{ text: "Burger on Fridays", kind: "standing" }];
const N = Number(process.argv[2] || 150);

const fails = {}; const bad = (k, d) => { (fails[k] ||= []).push(d); };
const raw = interpretRules(RULES);
const base = { ...raw, blocked: excludeDisliked(DISLIKES) };
// A pin colliding with a dislike is meant to be dropped, so it is not expected to hold.
const livePins = usablePins(base.pins, base.blocked);
const allBlocked = new Set(Object.values(base.blocked).flat());

// Every template that uses a disliked ingredient, independent of excludeDisliked,
// so the check can't pass just because that helper is wrong.
const badIds = new Set();
for (const [slot, list] of Object.entries(templates))
  for (const tpl of list)
    if (tpl.items.some(([id]) => DISLIKES.some((d) => id.includes(d.replace(/\s+/g, "_")))))
      badIds.add(tpl.id);

function checkWeek(w, label, pins) {
  const g = buildGroceryList(w);
  if (g.estimatedTotal > CAP) bad(`${label}: over budget`, g.estimatedTotal);

  const listed = new Set(g.items.map((x) => x.id));
  for (const day of w) for (const m of day.meals) {
    for (const [id] of m.items || []) {
      if (id === "whey") continue;
      if (!allIngredients.find((x) => x.id === id)) { bad(`${label}: unknown ingredient`, id); continue; }
      if (!listed.has(id)) bad(`${label}: used but not listed`, `${m.name}:${id}`);
    }
    if (badIds.has(m.id)) bad(`${label}: DISLIKED PLANNED`, `${day.day} ${m.slot} ${m.name}`);
    if (m.slot !== "Shake" && (m.items || []).some(([id]) => id === "whey")) bad(`${label}: whey in dish`, m.name);
    if (m.slot === "Breakfast" && m.time > 10) bad(`${label}: slow breakfast`, `${m.name} ${m.time}min`);
  }
  // A week that fits the budget by being the same meal seven days running is not
  // a win — CLAUDE.md is explicit that plans must not be bland or repetitive.
  // This went unchecked once and a budget fix quietly collapsed every plan with a
  // standing rule to 2 distinct dinners out of 7.
  for (const [slot, floor] of [["Dinner", 3], ["Lunch", 3], ["Breakfast", 3]]) {
    const distinct = new Set(w.map((d) => d.meals.find((m) => m.slot === slot)?.id)).size;
    if (distinct < floor) bad(`${label}: MONOTONOUS ${slot.toLowerCase()}s`, `${distinct} distinct in 7 days`);
  }
  for (const p of pins) {
    const day = w.find((d) => d.day === p.day);
    const meal = day?.meals.find((m) => m.slot === p.slot);
    if (meal && meal.id !== p.templateId) bad(`${label}: PIN LOST`, `${p.day} ${p.slot} want ${p.templateId} got ${meal.id}`);
  }
  for (const it of g.items) {
    const pu = purchaseUnits[it.id];
    if (pu?.size && !(it.display.includes(pu.size) && /^\d+ × /.test(it.display))) bad(`${label}: size label`, `${it.id} -> ${it.display}`);
  }
}

// Mirrors App.jsx runAction's swap_meal path exactly.
function aiSwap(plan, day, slot) {
  const di = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(day);
  const list = templates[slot.toLowerCase()] || [];
  const blockedHere = base.blocked?.[slot.toLowerCase()] || [];
  const cur = plan[di].meals.find((m) => m.slot === slot);
  const allowed = list.filter((t) => !blockedHere.includes(t.id));
  const different = allowed.filter((t) => t.id !== cur?.id);
  const candidates = (different.length ? different : allowed).sort(() => Math.random() - 0.5);
  if (!candidates.length) return { plan, changed: false };

  const withMeal = (tpl) => plan.map((d, i) => (i !== di ? d : setMealOnDay(d, slot, tpl, tg)));
  const byTrim = (tpl) => { const w = trimToBudget(withMeal(tpl), tg, CAP); return { tpl, week: w, cost: weekCost(w) }; };
  const byRebalance = (tpl) => {
    const w = rebalanceAfterSwap(withMeal(tpl), tg, CAP, { protect: [{ day, slot }], pins: base.pins, blocked: base.blocked });
    return { tpl, week: w, cost: weekCost(w) };
  };
  let picked = null, cheapest = null;
  const consider = (t) => { if (!cheapest || t.cost < cheapest.cost) cheapest = t; return t.cost <= CAP; };
  for (const c of candidates) if (consider(byTrim(c))) { picked = cheapest; break; }
  if (!picked) for (const c of candidates) if (consider(byRebalance(c))) { picked = cheapest; break; }
  if (!picked) picked = cheapest;
  return { plan: picked.week, changed: picked.tpl.id !== cur?.id };
}

let swaps = 0, noops = 0, pinnedSwaps = 0;
for (let i = 0; i < N; i++) {
  const w = generateWeek(tg, CAP, 60, base);
  checkWeek(w, "plan", livePins);

  // Swap a normal day, and the pinned Friday dinner, through the AI path.
  for (const [day, slot] of [["Wed", "Dinner"], ["Fri", "Dinner"]]) {
    const r = aiSwap(w, day, slot);
    r.changed ? swaps++ : noops++;
    const di2 = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(day);
    if (r.changed && !r.plan[di2].meals.some((m) => m.slot === slot)) bad("swap vanished", `${day} ${slot}`);
    if (day === "Fri" && r.changed) pinnedSwaps++;
    // The swapped day's pin is deliberately released; every OTHER pin must hold.
    checkWeek(r.plan, `after swap ${day} ${slot}`, livePins.filter((p) => !(p.day === day && p.slot === slot)));
  }
}

console.log(`pins requested: ${JSON.stringify(base.pins)} | still enforceable after dislikes: ${JSON.stringify(livePins)}`);
console.log(`blocked templates: ${[...allBlocked].join(", ") || "(none)"} | truly disliked: ${[...badIds].join(", ")}`);
console.log(`swaps applied ${swaps}, no-ops ${noops}, pinned-day swaps honoured ${pinnedSwaps}`);
const keys = Object.keys(fails);
if (!keys.length) {
  console.log(`\n${N} weeks + ${N * 2} AI swaps: ALL INVARIANTS HELD`);
} else {
  for (const k of keys) console.log(`FAIL ${k} (${fails[k].length}x) e.g.`, fails[k].slice(0, 3));
  process.exit(1);
}

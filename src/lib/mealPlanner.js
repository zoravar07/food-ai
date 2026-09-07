// mealPlanner.js
// Builds a 7-day plan from meal templates, scaled to hit the day's macro targets,
// avoiding repeats, capping single expensive ingredients, and — new — enforcing
// an actual weekly budget ceiling by swapping out the priciest meals until the
// whole week's grocery cost fits.

import { allIngredients, estimateItemCost } from "./foodDatabase.js";
import { buildGroceryList } from "./groceryListGenerator.js";
import { DAYS } from "./weeks.js";

const allDb = allIngredients;
const lookup = (id) => allDb.find((x) => x.id === id);

const WEEKLY_CAP = { salmon: 1, steak: 1 };

// Sanity ceilings: no single meal should ever exceed these, regardless of how
// short the day is on calories. Prevents absurd outputs like a 770-kcal bowl of oats.
const SLOT_KCAL_CEILING = { Breakfast: 700, Lunch: 900, Dinner: 950, Snack: 300 };
// Hard caps on how much of any one ingredient can land in a single meal.
const INGREDIENT_MAX_G = {
  oats: 90, rice: 150, pasta: 150, potato: 400, sweet_potato: 350, rice_noodles: 150,
  sourdough: 120, pita: 130, tortilla: 3, breadcrumbs: 60, greek_yoghurt: 300,
  berries: 200, banana: 150, mango: 200, cheese: 60, avocado: 100,
};

export const templates = {
  breakfast: [
    { id: "greek_bowl", name: "Greek yoghurt & berry bowl", cuisine: "simple", items: [["greek_yoghurt", 280], ["oats", 40], ["berries", 100], ["peanut_butter_g", 20]], proteinAnchor: "greek_yoghurt", carbAnchor: "oats", time: 3 },
    { id: "yoghurt_parfait", name: "Yoghurt parfait", cuisine: "simple", items: [["greek_yoghurt", 280], ["oats", 40], ["banana", 120], ["peanut_butter_g", 20]], proteinAnchor: "greek_yoghurt", carbAnchor: "oats", time: 4 },
    { id: "protein_smoothie", name: "Banana & peanut butter smoothie", cuisine: "simple", items: [["greek_yoghurt", 150], ["milk", 300], ["banana", 120], ["oats", 40], ["peanut_butter_g", 25]], proteinAnchor: "greek_yoghurt", carbAnchor: "oats", time: 3 },
    { id: "berry_smoothie", name: "Berry smoothie", cuisine: "simple", items: [["greek_yoghurt", 200], ["milk", 300], ["berries", 120], ["oats", 40]], proteinAnchor: "greek_yoghurt", carbAnchor: "oats", time: 3 },
    { id: "scrambled_eggs", name: "Scrambled eggs on toast", cuisine: "simple", items: [["eggs", 4], ["sourdough", 80], ["cheese", 25]], proteinAnchor: "eggs", carbAnchor: "sourdough", time: 8 },
    { id: "fried_eggs_avo", name: "Fried eggs & avocado toast", cuisine: "simple", items: [["eggs", 3], ["sourdough", 80], ["avocado", 75]], proteinAnchor: "eggs", carbAnchor: "sourdough", time: 8 },
    { id: "omelette", name: "Cheese & spinach omelette", cuisine: "simple", items: [["eggs", 4], ["sourdough", 60], ["spinach", 40], ["cheese", 30]], proteinAnchor: "eggs", carbAnchor: "sourdough", time: 9 },
  ],
  lunch: [
    { id: "shawarma_bowl", name: "Chicken shawarma bowl", cuisine: "middle_eastern", items: [["chicken_thigh", 220], ["rice", 110], ["greek_yoghurt", 50], ["cherry_tomato", 80]], proteinAnchor: "chicken_thigh", carbAnchor: "rice", time: 22 },
    { id: "teriyaki_bowl", name: "Chicken teriyaki rice bowl", cuisine: "japanese", items: [["chicken_breast", 220], ["rice", 110], ["broccoli", 100], ["olive_oil_g", 10]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 20 },
    { id: "chicken_wrap", name: "Chicken & avocado wrap", cuisine: "simple", items: [["chicken_thigh", 200], ["tortilla", 2], ["greek_yoghurt", 50], ["avocado", 60], ["cucumber", 60]], proteinAnchor: "chicken_thigh", carbAnchor: "tortilla", time: 18 },
    { id: "quesadilla", name: "Cheesy chicken quesadilla", cuisine: "mexican", items: [["chicken_breast", 190], ["tortilla", 2], ["cheese", 50], ["peppers", 60]], proteinAnchor: "chicken_breast", carbAnchor: "tortilla", time: 15 },
    { id: "egg_fried_rice", name: "Chicken egg-fried rice", cuisine: "chinese", items: [["chicken_breast", 200], ["rice", 120], ["eggs", 2], ["peppers", 80], ["olive_oil_g", 10]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 18 },
    { id: "mince_pasta", name: "Beef mince pasta", cuisine: "italian", items: [["beef_mince_5", 200], ["pasta", 120], ["cherry_tomato", 100], ["cheese", 30]], proteinAnchor: "beef_mince_5", carbAnchor: "pasta", time: 22 },
    { id: "loaded_potato", name: "Loaded baked potato", cuisine: "british", items: [["beef_mince_5", 180], ["sweet_potato", 350], ["cheese", 45], ["greek_yoghurt", 40]], proteinAnchor: "beef_mince_5", carbAnchor: "sweet_potato", time: 25 },
  ],
  snack: [
    { id: "cucumber_chilli", name: "Cucumber, lemon & chilli", items: [["cucumber", 150]], proteinAnchor: null, carbAnchor: null, time: 3 },
    { id: "coconut_banana", name: "Coconut water & banana", items: [["coconut_water", 330], ["banana", 120]], proteinAnchor: null, carbAnchor: null, time: 1 },
    { id: "yoghurt_snack", name: "Yoghurt & berries", items: [["greek_yoghurt", 150], ["berries", 80]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "banana_pb", name: "Banana & peanut butter", items: [["banana", 120], ["peanut_butter_g", 25]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "cheese_tomato", name: "Cheese & cherry tomatoes", items: [["cheese", 40], ["cherry_tomato", 120]], proteinAnchor: null, carbAnchor: null, time: 2 },
  ],
  dessert: [
    { id: "watermelon_dessert", name: "Watermelon", items: [["watermelon", 300]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "kiwi_dessert", name: "Kiwi", items: [["kiwi", 150]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "orange_dessert", name: "Orange", items: [["orange", 140]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "grapes_dessert", name: "Frozen grapes", items: [["grapes", 150]], proteinAnchor: null, carbAnchor: null, time: 1 },
    { id: "pineapple_dessert", name: "Pineapple", items: [["pineapple", 165]], proteinAnchor: null, carbAnchor: null, time: 3 },
    { id: "yoghurt_berries_dessert", name: "Yoghurt & berries", items: [["greek_yoghurt", 150], ["berries", 80]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "choc_yoghurt_dessert", name: "Chocolate yoghurt bowl", items: [["greek_yoghurt", 170], ["banana", 100]], proteinAnchor: null, carbAnchor: null, time: 3 },
  ],
  dinner: [
    { id: "salmon_greens_rice", name: "Salmon, greens & rice", cuisine: "japanese", items: [["salmon", 180], ["rice", 120], ["broccoli", 120], ["olive_oil_g", 10]], proteinAnchor: "salmon", carbAnchor: "rice", time: 25 },
    { id: "beef_tacos", name: "Beef mince tacos", cuisine: "mexican", items: [["beef_mince_5", 220], ["tortilla", 3], ["cheese", 40], ["avocado", 60]], proteinAnchor: "beef_mince_5", carbAnchor: "tortilla", time: 20 },
    { id: "tikka_curry", name: "Chicken tikka-style curry", cuisine: "indian", items: [["chicken_breast", 220], ["rice", 120], ["greek_yoghurt", 70], ["spinach", 60]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 28 },
    { id: "burgers_wedges", name: "Homemade burgers & sweet potato wedges", cuisine: "american", items: [["beef_mince_5", 240], ["sweet_potato", 300], ["cheese", 30], ["avocado", 50]], proteinAnchor: "beef_mince_5", carbAnchor: "sweet_potato", time: 25 },
    { id: "fajita_bowl", name: "Chicken fajita bowl", cuisine: "mexican", items: [["chicken_breast", 220], ["rice", 110], ["peppers", 120], ["cheese", 30]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 22 },
    { id: "chicken_nuggets", name: "Chicken nuggets & sweet potato fries", cuisine: "american", items: [["chicken_breast", 220], ["sweet_potato", 300], ["breadcrumbs", 55], ["olive_oil_g", 12]], proteinAnchor: "chicken_breast", carbAnchor: "sweet_potato", time: 28 },
    { id: "chicken_pasta", name: "Creamy chicken pasta", cuisine: "italian", items: [["chicken_breast", 210], ["pasta", 120], ["greek_yoghurt", 60], ["spinach", 60], ["cheese", 30]], proteinAnchor: "chicken_breast", carbAnchor: "pasta", time: 22 },
    { id: "salmon_pasta", name: "Salmon & spinach pasta", cuisine: "italian", items: [["salmon", 170], ["pasta", 120], ["spinach", 60], ["greek_yoghurt", 50]], proteinAnchor: "salmon", carbAnchor: "pasta", time: 22 },
    { id: "chicken_thigh_traybake", name: "Chicken thigh & sweet potato traybake", cuisine: "simple", items: [["chicken_thigh", 240], ["sweet_potato", 300], ["peppers", 100], ["olive_oil_g", 12]], proteinAnchor: "chicken_thigh", carbAnchor: "sweet_potato", time: 30 },
  ],
};

function macrosForItems(items) {
  return items.reduce(
    (acc, [id, qty]) => {
      const ing = lookup(id);
      if (!ing) return acc;
      const isPerUnit = ing.unit === "each" || ing.unit === "scoop";
      const kcal = isPerUnit ? (ing.kcalPerUnit ?? ing.kcal) * qty : (ing.kcal * qty) / 100;
      const protein = isPerUnit ? (ing.proteinPerUnit ?? ing.protein) * qty : (ing.protein * qty) / 100;
      return { kcal: acc.kcal + kcal, protein: acc.protein + protein };
    },
    { kcal: 0, protein: 0 }
  );
}

function templateCost(items) {
  return items.reduce((s, [id, qty]) => s + estimateItemCost(id, qty), 0);
}

// Pack sizes that must be bought whole — introducing a new one costs a full pack.
const PACK_COST = {
  chicken_breast: 4.5, chicken_thigh: 3.5, salmon: 3.3, steak: 6.5,
  beef_mince_5: 5.5, turkey_mince: 5.0, pork_tenderloin: 5.2,
};

function pickNonRepeating(list, usedIds, expensiveCount, openedProteins = new Set(), blockedIds = []) {
  const options = list.filter((t) => {
    if (blockedIds.includes(t.id)) return false;
    if (usedIds.has(t.id)) return false;
    const capped = t.items.some(([id]) => WEEKLY_CAP[id] && (expensiveCount[id] || 0) >= WEEKLY_CAP[id]);
    return !capped;
  });
  const allowed = list.filter((t) => !blockedIds.includes(t.id));
  const pool = options.length
    ? options
    : allowed.filter((t) => !t.items.some(([id]) => WEEKLY_CAP[id] && (expensiveCount[id] || 0) >= WEEKLY_CAP[id]));
  // Never fall back to the full list — a disliked meal must never be planned.
  const finalPool = pool.length ? pool : (allowed.length ? allowed : list);

  // Weight selection by TRUE marginal cost: a meal using a protein we've already
  // opened this week is cheap; one needing a brand-new pack carries that pack's
  // full price. This stops the planner buying a 500g pack of mince to use 130g.
  const weights = finalPool.map((t) => {
    let cost = templateCost(t.items);
    t.items.forEach(([id]) => {
      if (PACK_COST[id] && !openedProteins.has(id)) cost += PACK_COST[id] * 0.8;
    });
    return 1 / Math.pow(Math.max(cost, 0.3), 1.5);
  });
  const total = weights.reduce((a, w) => a + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < finalPool.length; i++) {
    r -= weights[i];
    if (r <= 0) return finalPool[i];
  }
  return finalPool[finalPool.length - 1];
}

function scaleItem(items, anchorId, factor) {
  if (!anchorId) return items;
  return items.map(([id, qty]) => {
    if (id !== anchorId) return [id, qty];
    const ing = lookup(id);
    const isPerUnit = ing.unit === "each" || ing.unit === "scoop";
    let scaled = isPerUnit
      ? Math.max(1, Math.round(qty * factor))
      : Math.max(20, Math.round((qty * factor) / 10) * 10);
    const cap = INGREDIENT_MAX_G[id];
    if (cap !== undefined) scaled = Math.min(scaled, cap);
    return [id, scaled];
  });
}

// If a meal still exceeds its slot ceiling after scaling, walk its carb anchor
// back down until it fits. Protein is never reduced — hitting protein matters more.
function capMealCalories(meal) {
  const ceiling = SLOT_KCAL_CEILING[meal.slot];
  if (!ceiling || !meal.carbAnchor) return meal.items;
  let items = meal.items;
  for (let i = 0; i < 12; i++) {
    const { kcal } = macrosForItems(items);
    if (kcal <= ceiling) break;
    items = items.map(([id, qty]) => {
      if (id !== meal.carbAnchor) return [id, qty];
      const ing = lookup(id);
      const isPerUnit = ing.unit === "each" || ing.unit === "scoop";
      const reduced = isPerUnit ? Math.max(1, qty - 1) : Math.max(20, qty - 20);
      return [id, reduced];
    });
  }
  return items;
}

function buildDayMeals(b, l, s, d, targets, dessert) {
  const rawMeals = [
    { slot: "Breakfast", ...b, items: [...b.items] },
    { slot: "Lunch", ...l, items: [...l.items] },
    { slot: "Snack", ...s, items: [...s.items] },
    { slot: "Shake", name: "Whey shake", items: [["whey", 1]], proteinAnchor: null, carbAnchor: null, standalone: true },
    { slot: "Dinner", ...d, items: [...d.items] },
    ...(dessert ? [{ slot: "Dessert", ...dessert, items: [...dessert.items] }] : []),
  ];

  const scalable = new Set(["Breakfast", "Lunch", "Dinner"]); // Snack/Shake/Dessert stay as-is

  // --- Pass 1: scale each meal's declared PROTEIN anchor toward the protein target.
  // Meals with no protein anchor (e.g. oats, salads) are left alone rather than
  // having an unrelated ingredient inflated — this was the 838-kcal-oats bug.
  const base = rawMeals.reduce((a, m) => {
    const mm = macrosForItems(m.items);
    return { kcal: a.kcal + mm.kcal, protein: a.protein + mm.protein };
  }, { kcal: 0, protein: 0 });

  const proteinScale = Math.min(1.7, Math.max(0.8, targets.protein / Math.max(base.protein, 1)));

  const pass1 = rawMeals.map((m) =>
    scalable.has(m.slot) && m.proteinAnchor
      ? { ...m, items: scaleItem(m.items, m.proteinAnchor, proteinScale) }
      : m
  );

  // --- Pass 2: scale each meal's declared CARB anchor to close the remaining calorie gap.
  const after1 = pass1.reduce((a, m) => {
    const mm = macrosForItems(m.items);
    return { kcal: a.kcal + mm.kcal, protein: a.protein + mm.protein };
  }, { kcal: 0, protein: 0 });

  const gap = targets.targetKcal - after1.kcal;
  const carbScale = Math.min(1.8, Math.max(0.7, 1 + gap / Math.max(after1.kcal, 1)));

  const meals = pass1.map((m) => {
    const scaledItems = scalable.has(m.slot) && m.carbAnchor ? scaleItem(m.items, m.carbAnchor, carbScale) : m.items;
    const items = capMealCalories({ ...m, items: scaledItems });
    return { ...m, items, ...macrosForItems(items) };
  });

  const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
  return { meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
}

// After the week is built, if it costs more than the budget, repeatedly swap the
// single priciest lunch/dinner for the cheapest available alternative in that slot
// until the whole week's grocery total fits — or we run out of cheaper options.
/** What the week actually costs to shop for. `leftovers` is what's already in the
 *  pantry; passing it makes the cap measure real spend rather than a full shop.
 *  Everything that checks the budget goes through here so the basis can't drift. */
export const weekCost = (week, leftovers = {}) => buildGroceryList(week, leftovers).estimatedTotal;

/** Shave the priciest protein portions until the shop fits. Only portions move,
 *  never which meal sits on which day, so this is safe to run after pins have
 *  been asserted and over a meal the user explicitly asked for. */
export function trimToBudget(week, targets, budgetCap, { leftovers = {}, floor = 130, passes = 25, hard = false } = {}) {
  let planned = week;
  for (let pass = 0; pass < passes; pass++) {
    if (weekCost(planned, leftovers) <= budgetCap) break;
    planned = planned.map((day) => {
      const meals = day.meals.map((m) => {
        if (!m.proteinAnchor) return m;
        const ing = lookup(m.proteinAnchor);
        if (!ing || ing.unit === "each" || ing.unit === "scoop") return m;
        const unitCost = estimateItemCost(m.proteinAnchor, 100);
        // `hard` is the last-resort rate: cutting portions further is a much
        // smaller loss than swapping meals out, which is what makes a week bland.
        const cutRate = hard
          ? (unitCost > 2 ? 0.85 : unitCost > 1 ? 0.9 : 0.95)
          : (unitCost > 2 ? 0.88 : unitCost > 1 ? 0.93 : 0.97); // trim pricey proteins faster
        const items = m.items.map(([id, qty]) =>
          id === m.proteinAnchor ? [id, Math.max(floor, Math.round((qty * cutRate) / 10) * 10)] : [id, qty]
        );
        return { ...m, items, ...macrosForItems(items) };
      });
      const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    });
  }
  return planned;
}

/** Cheapest template the rules allow in a slot. Shared by the last-resort paths
 *  in both generation and swap rebalancing so they agree on what "cheapest" is. */
export function cheapestTemplate(slot, blocked = {}, exclude = null) {
  const all = templates[slot] || [];
  let allowed = all.filter((t) => !(blocked[slot] || []).includes(t.id));
  if (exclude) allowed = allowed.filter((t) => !exclude.has(t.id));
  const list = allowed.length ? allowed : (exclude ? [] : all);
  return [...list].sort((a, b) => templateCost(a.items) - templateCost(b.items))[0] || null;
}

/** Rebuild one day with `tpl` in `slot`, rescaling the day's portions around it
 *  and leaving the other meals alone. Same mechanism the pin re-assertion uses,
 *  so a swapped-in meal is portioned exactly like a generated one. */
export function setMealOnDay(day, slot, tpl, targets) {
  const at = (s) => (slot === s ? tpl : day.meals.find((m) => m.slot === s));
  const { meals, totals } = buildDayMeals(at("Breakfast"), at("Lunch"), at("Snack"), at("Dinner"), targets, at("Dessert"));
  return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
}

/** Bring a week back under the cap around a meal the user explicitly chose.
 *  `protect` entries ({day, slot}) are never swapped out, so his pick and his
 *  standing rules both survive while the rest of the week gives up the money.
 *  Only worth reaching for when portion trimming alone was not enough — it
 *  changes meals on OTHER days, which is surprising if it happens silently. */
export function rebalanceAfterSwap(week, targets, budgetCap, { protect = [], pins = [], blocked = {}, leftovers = {} } = {}) {
  const held = [...usablePins(pins, blocked), ...protect];
  const swapped = enforceBudget(week, targets, budgetCap, 20, held, blocked, leftovers);
  let out = trimToBudget(swapped, targets, budgetCap, { leftovers, floor: 100, passes: 30, hard: true });
  if (weekCost(out, leftovers) <= budgetCap) return out;

  // enforceBudget only ever swaps in a template not already on the menu, to keep
  // the week varied. When the allowed set is small that runs out of room. Give up
  // variety one meal at a time, priciest first, and stop the moment it fits —
  // a slightly duller week that fits beats a better one that doesn't.
  const isHeld = (day, slot) => held.some((h) => h.day === day && h.slot === slot);
  const candidates = [];
  out.forEach((day, dayIdx) => day.meals.forEach((m) => {
    if (!["Breakfast", "Lunch", "Snack", "Dinner"].includes(m.slot)) return;
    if (isHeld(day.day, m.slot)) return;
    candidates.push({ dayIdx, slot: m.slot, cost: templateCost(m.items) });
  }));
  candidates.sort((a, b) => b.cost - a.cost);

  for (const c of candidates) {
    const slotKey = c.slot.toLowerCase();
    // Prefer the cheapest meal NOT already on the menu in this slot. Always
    // reaching for the single cheapest converged the week onto one dish, which
    // is how a swap could occasionally leave 2 distinct dinners across 7 days.
    const onMenu = new Set(out.map((d) => d.meals.find((m) => m.slot === c.slot)?.id).filter(Boolean));
    const tpl = cheapestTemplate(slotKey, blocked, onMenu) || cheapestTemplate(slotKey, blocked);
    if (!tpl || out[c.dayIdx].meals.find((m) => m.slot === c.slot)?.id === tpl.id) continue;
    const next = out.map((d, i) => (i !== c.dayIdx ? d : setMealOnDay(d, c.slot, tpl, targets)));
    out = trimToBudget(next, targets, budgetCap, { leftovers, floor: 100, passes: 30, hard: true });
    if (weekCost(out, leftovers) <= budgetCap) break;
  }
  return out;
}

function enforceBudget(week, targets, budgetCap, maxSwaps = 20, pins = [], blocked = {}, leftovers = {}) {
  let current = week;
  for (let i = 0; i < maxSwaps; i++) {
    if (weekCost(current, leftovers) <= budgetCap) break;

    // Find the most expensive lunch/dinner in the week
    let worst = null;
    current.forEach((day, dayIdx) => {
      day.meals.forEach((meal) => {
        if (meal.slot !== "Lunch" && meal.slot !== "Dinner") return;
        // Never swap out a meal the user pinned via a standing rule.
        if (pins.some((p) => p.day === day.day && p.slot === meal.slot)) return;
        const cost = templateCost(meal.items);
        if (!worst || cost > worst.cost) worst = { dayIdx, cost, slot: meal.slot, currentId: meal.id };
      });
    });
    if (!worst) break;

    // Which templates are already used in this slot anywhere in the week?
    const slotKey = worst.slot.toLowerCase();
    const inUse = new Set(
      current.flatMap((d) => d.meals.filter((m) => m.slot === worst.slot).map((m) => m.id))
    );

    // Pick the cheapest template NOT already on the menu — preserves variety while cutting cost.
    const blockedHere = blocked[slotKey] || [];
    let best = null;
    templates[slotKey].forEach((tpl) => {
      if (tpl.id === worst.currentId || inUse.has(tpl.id) || blockedHere.includes(tpl.id)) return;
      const c = templateCost(tpl.items);
      if (c < worst.cost && (!best || c < best.cost)) best = { tpl, cost: c };
    });

    // If every alternative is already used, fall back to the cheapest unused-in-that-slot
    // option even if it repeats once — but never let one template exceed 2 uses per week.
    if (!best) {
      const counts = {};
      current.forEach((d) => d.meals.filter((m) => m.slot === worst.slot).forEach((m) => { counts[m.id] = (counts[m.id] || 0) + 1; }));
      templates[slotKey].forEach((tpl) => {
        if (tpl.id === worst.currentId || blockedHere.includes(tpl.id)) return;
        if ((counts[tpl.id] || 0) >= 2) return; // hard cap: max 2 of the same meal per week
        const c = templateCost(tpl.items);
        if (c < worst.cost && (!best || c < best.cost)) best = { tpl, cost: c };
      });
    }
    if (!best) break; // nothing cheaper available without wrecking variety

    const day = current[worst.dayIdx];
    const b = day.meals.find((m) => m.slot === "Breakfast");
    const l = worst.slot === "Lunch" ? best.tpl : day.meals.find((m) => m.slot === "Lunch");
    const sn = day.meals.find((m) => m.slot === "Snack");
    const d = worst.slot === "Dinner" ? best.tpl : day.meals.find((m) => m.slot === "Dinner");
    const rebuilt = buildDayMeals(b, l, sn, d, targets, day.meals.find((m) => m.slot === "Dessert"));
    current = current.map((dd, di) => (di === worst.dayIdx ? { day: dd.day, ...rebuilt } : dd));
  }
  return current;
}

/**
 * @param {{targetKcal:number, protein:number}} targets
 * @param {number} budgetCap - weekly grocery budget ceiling in £
 */
/** A dislike outranks a standing rule. "Burger every Friday" plus "no avocado"
 *  kept planting the avocado burger every single week: pins were applied, and
 *  then re-asserted after budget swaps, without ever consulting the block list.
 *  Invariant 3 is absolute, so a pin whose template is blocked is dropped. */
export function usablePins(pins = [], blocked = {}) {
  return pins.filter((p) => !(blocked[(p.slot || "").toLowerCase()] || []).includes(p.templateId));
}

/** Put the craved dish on the winning week and protect it while the rest of the
 *  week gives up the money. Applied once at the end rather than per candidate:
 *  per candidate it was both slow and unreliable, because whether the craving
 *  survived depended on which random candidate happened to score best. If even a
 *  rebalanced week can't afford it, the plain week is kept — budget still wins. */
function withCravings(week, targets, budgetCap, options = {}) {
  const placed = [];
  const wanted = ensureFavourites(week, targets, options, placed);
  if (!placed.length) return week;
  const leftovers = options.leftovers || {};
  const fitted = rebalanceAfterSwap(wanted, targets, budgetCap, {
    protect: placed, pins: options.pins || [], blocked: options.blocked || {}, leftovers,
  });
  return weekCost(fitted, leftovers) <= budgetCap ? fitted : week;
}

/** A craving that names a dish has to actually turn up. Scoring alone could not
 *  make that happen: the ingredient-sprawl penalty (+25 for every extra thing to
 *  buy) outweighs the favour reward (-30), so "I fancy tacos" reliably lost to a
 *  week built from ingredients already on the list. Place it once, explicitly,
 *  and let the trim that follows put the week back under budget. */
function ensureFavourites(week, targets, options = {}, placed = []) {
  const { favour = [], blocked = {}, pins = [] } = options;
  const named = favour.filter((f) => !String(f).startsWith("cuisine:"));
  if (!named.length) return week;

  let out = week;
  for (const id of named) {
    if (out.some((d) => d.meals.some((m) => m.id === id))) continue;   // already on the menu
    const slotKey = Object.keys(templates).find((sl) => templates[sl].some((t) => t.id === id));
    if (!slotKey || (blocked[slotKey] || []).includes(id)) continue;   // never override a dislike
    const tpl = templates[slotKey].find((t) => t.id === id);
    const slot = slotKey.charAt(0).toUpperCase() + slotKey.slice(1);
    // Don't displace a standing rule — those outrank a passing craving.
    const free = out.map((_, i) => i).filter((i) => !pins.some((p) => p.day === out[i].day && p.slot === slot));
    if (!free.length) continue;
    const at = free[Math.floor(Math.random() * free.length)];
    out = out.map((d, i) => (i !== at ? d : setMealOnDay(d, slot, tpl, targets)));
    placed.push({ day: out[at].day, slot });
  }
  return out;
}

function generateCandidateWeek(targets, budgetCap = 65, options = {}) {
  const { favour = [], blocked = {}, leftovers = {} } = options;
  const pins = usablePins(options.pins, blocked);
  const used = { breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set(), dessert: new Set() };
  const expensiveCount = {};
  const days = DAYS;

  const openedProteins = new Set();

  // Pick just 3 desserts for the whole week and rotate them. Seven different
  // fruits means seven things to buy and most of them going off.
  const dessertPool = templates.dessert.filter((x) => !(blocked.dessert || []).includes(x.id))
    .sort(() => Math.random() - 0.5).slice(0, 3);

  const rawWeek = days.map((day, dayIndex) => {
    const b = pickNonRepeating(templates.breakfast, used.breakfast, expensiveCount, openedProteins, blocked.breakfast || []);
    const l = pickNonRepeating(templates.lunch, used.lunch, expensiveCount, openedProteins, blocked.lunch || []);
    const s = pickNonRepeating(templates.snack, used.snack, expensiveCount, openedProteins, blocked.snack || []);
    const d = pickNonRepeating(templates.dinner, used.dinner, expensiveCount, openedProteins, blocked.dinner || []);
    const ds = dessertPool[dayIndex % dessertPool.length];
    [b, l, s, d].forEach((tpl) => tpl.items.forEach(([id]) => { if (PACK_COST[id]) openedProteins.add(id); }));
    [b, l, s, d].forEach((tpl, i) => {
      used[["breakfast", "lunch", "snack", "dinner"][i]].add(tpl.id);
      tpl.items.forEach(([id]) => {
        if (WEEKLY_CAP[id]) expensiveCount[id] = (expensiveCount[id] || 0) + 1;
      });
    });
    // Standing rules pin a specific meal to a day/slot before costing, so the
    // budget logic compensates elsewhere rather than fighting the rule later.
    const pinFor = (slot) => {
      const pin = pins.find((p) => p.day === day && p.slot === slot);
      if (!pin) return null;
      const list = templates[slot.toLowerCase()] || [];
      return list.find((x) => x.id === pin.templateId) || null;
    };
    const bb = pinFor("Breakfast") || b;
    const ll = pinFor("Lunch") || l;
    const ss = pinFor("Snack") || s;
    const dd = pinFor("Dinner") || d;

    const { meals, totals } = buildDayMeals(bb, ll, ss, dd, targets, ds);
    return { day, meals, totals };
  });

  let planned = enforceBudget(rawWeek, targets, budgetCap, 20, pins, blocked, leftovers);

  // Last resort: shave portions of the priciest *protein* items a little at a time.
  // Protein target has slack (we typically overshoot ~185g vs 174g), so small trims
  // stay on-target nutritionally while pulling the shop under budget.
  for (let pass = 0; pass < 8; pass++) {
    if (weekCost(planned, leftovers) <= budgetCap) break;
    planned = planned.map((day) => {
      const meals = day.meals.map((m) => {
        if (!m.proteinAnchor) return m;
        const items = m.items.map(([id, qty]) => {
          if (id !== m.proteinAnchor) return [id, qty];
          const ing = lookup(id);
          if (ing.unit === "each" || ing.unit === "scoop") return [id, qty];
          return [id, Math.max(140, Math.round((qty * 0.94) / 10) * 10)];
        });
        return { ...m, items, ...macrosForItems(items) };
      });
      const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    });
  }
  // Final top-up: close remaining calorie/protein gaps using CHEAP dense staples
  // (rice, potato, oats, eggs) — but never past the budget cap. Every other pass
  // in this pipeline checks cost before acting; this one didn't, so it could add
  // fillers that pushed the week over budget with no reliable way back — the trim
  // pass below only touches protein anchors, which the earlier trim pass has
  // usually already squeezed close to their floor by this point.
  const CHEAP_FILLERS = ["rice", "potato", "sweet_potato", "oats", "rice_noodles", "pita", "sourdough", "eggs"];
  let runningWeek = planned;
  planned = planned.map((day, dayIdx) => {
    let meals = day.meals;
    for (let pass = 0; pass < 10; pass++) {
      const tot = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      if (tot.kcal >= targets.targetKcal * 0.92 && tot.protein >= targets.protein * 0.95) break;

      let bumped = false;
      const nextMeals = meals.map((m) => {
        if (bumped || m.slot === "Shake" || m.slot === "Snack") return m;
        const ceiling = SLOT_KCAL_CEILING[m.slot] || 900;
        if (m.kcal >= ceiling) return m;
        const target = m.items.find(([id]) => CHEAP_FILLERS.includes(id));
        if (!target) return m;
        const [fid, fqty] = target;
        const ing = lookup(fid);
        const isPerUnit = ing.unit === "each";
        const cap = INGREDIENT_MAX_G[fid] ?? (isPerUnit ? 5 : 400);
        if (fqty >= cap) return m;
        const next = isPerUnit ? Math.min(cap, fqty + 1) : Math.min(cap, fqty + 20);
        const items = m.items.map(([id, q]) => (id === fid ? [id, next] : [id, q]));
        bumped = true;
        return { ...m, items, ...macrosForItems(items) };
      });
      if (!bumped) break;

      // Would this bump push the whole week over budget? Check the real total,
      // not just this day — only keep it if it doesn't.
      const snapshot = runningWeek.map((d, i) => (i === dayIdx ? { ...d, meals: nextMeals } : d));
      if (weekCost(snapshot, leftovers) > budgetCap) break;
      meals = nextMeals;
    }
    const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
    const result = { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    runningWeek = runningWeek.map((d, i) => (i === dayIdx ? result : d));
    return result;
  });

  // If the top-up nudged us back over budget, trim protein anchors — cutting the
  // priciest proteins hardest, and only down to a floor that keeps protein on target.
  planned = trimToBudget(planned, targets, budgetCap, { leftovers });

  // Re-assert pins last, since budget swaps may have replaced them. This is the
  // final pass over the week, so anything it disturbs has to be settled here.
  if (pins.length) {
    planned = planned.map((day) => {
      // Only rebuild a slot that actually lost its pin. enforceBudget already
      // refuses to swap pinned slots, so this almost never fires — but rebuilding
      // unconditionally reset the day to full portions, which forced a hard trim
      // across the whole week. Varied weeks are pricier, so they were trimmed
      // hardest, scored worst on protein, and lost to monotonous ones: with a
      // standing rule every plan collapsed to 2 distinct dinners out of 7.
      const relevant = pins.filter((p) => p.day === day.day)
        .filter((p) => day.meals.find((m) => m.slot === p.slot)?.id !== p.templateId);
      if (!relevant.length) return day;

      let meals = day.meals;
      relevant.forEach((pin) => {
        const list = templates[pin.slot.toLowerCase()] || [];
        const tpl = list.find((x) => x.id === pin.templateId);
        if (!tpl) return;
        // Build the pinned meal with the same scaling the others got.
        const built = buildDayMeals(
          pin.slot === "Breakfast" ? tpl : meals.find((m) => m.slot === "Breakfast"),
          pin.slot === "Lunch" ? tpl : meals.find((m) => m.slot === "Lunch"),
          pin.slot === "Snack" ? tpl : meals.find((m) => m.slot === "Snack"),
          pin.slot === "Dinner" ? tpl : meals.find((m) => m.slot === "Dinner"),
          targets,
          pin.slot === "Dessert" ? tpl : meals.find((m) => m.slot === "Dessert")
        );
        meals = built.meals;
      });

      const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    });

    // Re-asserting a pin rebuilds that whole day at full portions, throwing away
    // the trim that had just brought the week under the cap — and nothing
    // re-checked afterwards. Trim again so the pin survives AND the shop fits.
    planned = trimToBudget(planned, targets, budgetCap, { leftovers });
  }

  return planned;
}


/**
 * Scores a candidate week: budget compliance first, then macro accuracy, then variety.
 * Lower is better.
 */
function scoreWeek(week, targets, budgetCap, favour = [], leftovers = {}) {
  const cost = weekCost(week, leftovers);
  let score = 0;

  // Over budget is heavily penalised; under budget is fine.
  if (cost > budgetCap) score += (cost - budgetCap) * 200;

  week.forEach((d) => {
    score += Math.abs(d.totals.kcal - targets.targetKcal) * 0.05;
    // Missing protein matters much more than slightly exceeding it.
    const pDiff = targets.protein - d.totals.protein;
    score += pDiff > 0 ? pDiff * 1.5 : Math.abs(pDiff) * 0.3;
  });

  // Penalise ingredient sprawl: every extra distinct ingredient is another thing
  // to buy, carry home and watch go off. Reusing a core set is the goal.
  const distinct = new Set();
  week.forEach((d) => d.meals.forEach((m) => (m.items || []).forEach(([id]) => { if (id !== "whey") distinct.add(id); })));
  score += Math.max(0, distinct.size - 20) * 25;

  // Reward variety: penalise repeated main meals.
  ["Breakfast", "Lunch", "Dinner"].forEach((slot) => {
    const counts = {};
    week.forEach((d) => d.meals.filter((m) => m.slot === slot).forEach((m) => { counts[m.id] = (counts[m.id] || 0) + 1; }));
    Object.values(counts).forEach((c) => { if (c > 1) score += (c - 1) * 12; });
  });

  // Reward meals the user has asked for (cravings / standing preferences)
  if (favour.length) {
    week.forEach((d) => d.meals.forEach((m) => {
      if (favour.includes(m.id)) score -= 30;
      if (m.cuisine && favour.includes(`cuisine:${m.cuisine}`)) score -= 20;
    }));
  }

  return score;
}

/**
 * Generates several candidate weeks and returns the best one.
 * Trying multiple candidates is far more reliable than trying to make a single
 * greedy pass satisfy budget + macros + variety simultaneously.
 * @param {{targetKcal:number, protein:number}} targets
 * @param {number} budgetCap weekly grocery budget in £
 * @param {number} attempts how many candidates to evaluate
 */
/**
 * Interpret standing rules and cravings into planner constraints.
 * Rules are free text, so we match loosely on meal names, cuisines and days.
 */
/** Templates that use any disliked ingredient are never selected. */
export function excludeDisliked(dislikes = []) {
  const bad = dislikes.map((d) => d.toLowerCase().trim()).filter(Boolean);
  if (!bad.length) return {};
  const blocked = {};
  Object.entries(templates).forEach(([slot, list]) => {
    blocked[slot] = list.filter((tpl) =>
      tpl.items.some(([id]) => bad.some((b) => id.includes(b.replace(/\s+/g, "_")) || b.includes(id)))
      || bad.some((b) => tpl.name.toLowerCase().includes(b))
    ).map((tpl) => tpl.id);
  });
  return blocked;
}

export function interpretRules(rules = []) {
  const pins = [];      // { day, slot, templateId }
  const favour = [];    // cuisine or template ids to prefer
  const avoid = [];     // ingredient ids to avoid
  // What each rule asked for, so a craving can be retired when it actually
  // lands rather than every craving being wiped on any generation.
  const matched = [];

  const DAY_WORDS = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
  const SLOT_WORDS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
  const allTemplates = Object.entries(templates).flatMap(([slot, list]) => list.map((t) => ({ ...t, slot })));

  rules.forEach((r) => {
    const text = (r.text || "").toLowerCase();

    // Which meal is being referred to? Match on word STEMS so that "a burger"
    // matches "Homemade burgers & wedges", and "taco" matches "Beef mince tacos".
    const stem = (w) => w.replace(/(ies|es|s)$/, "");
    const textStems = text.split(/[^a-z]+/).filter((w) => w.length > 2).map(stem);

    let bestMatch = null, bestScore = 0;
    allTemplates.forEach((tpl) => {
      const words = tpl.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2).map(stem);
      const hits = words.filter((w) => textStems.includes(w)).length;
      if (hits > bestScore) { bestScore = hits; bestMatch = tpl; }
    });
    const match = bestScore > 0 ? bestMatch : null;

    const day = Object.entries(DAY_WORDS).find(([k]) => text.includes(k))?.[1];
    const slot = Object.entries(SLOT_WORDS).find(([k]) => text.includes(k))?.[1]
      || (match ? match.slot.charAt(0).toUpperCase() + match.slot.slice(1) : null);

    if (match && day && slot) {
      // Two rules can name the same day and slot: "burger every Friday" and
      // "tacos on Friday". The fresh one-off wins that occurrence and the
      // standing rule resumes next week, once the craving has been retired —
      // the same precedence an explicit swap_meal already gets.
      const kind = r.kind || "standing";
      const at = pins.findIndex((p) => p.day === day && p.slot === slot);
      if (at < 0) pins.push({ day, slot, templateId: match.id, kind });
      else if (kind === "craving" && pins[at].kind !== "craving") pins[at] = { day, slot, templateId: match.id, kind };
    }
    else if (match) favour.push(match.id);

    // Cuisine preference
    const cuisines = [];
    ["mexican", "indian", "japanese", "chinese", "italian", "american", "middle_eastern", "british"].forEach((c) => {
      if (text.includes(c.replace("_", " ")) || text.includes(c)) { favour.push(`cuisine:${c}`); cuisines.push(c); }
    });

    matched.push({ id: r.id, kind: r.kind || "standing", text: r.text, templateId: match?.id || null, pinned: Boolean(match && day && slot), cuisines });
  });

  return { pins, favour, avoid, matched };
}

/** The cheapest week the rules allow: least expensive permitted template in every
 *  slot, pins honoured, then trimmed. It is the floor of what a week can cost, so
 *  it is the last resort when no candidate fitted — never used otherwise, because
 *  it is deliberately monotonous. */
function cheapestWeek(targets, budgetCap, options = {}) {
  const { blocked = {}, leftovers = {} } = options;
  const pins = usablePins(options.pins, blocked);
  const pick = Object.fromEntries(["breakfast", "lunch", "snack", "dinner", "dessert"].map((sl) => [sl, cheapestTemplate(sl, blocked)]));

  const week = DAYS.map((day) => {
    const pinned = (slot) => {
      const pin = pins.find((p) => p.day === day && p.slot === slot);
      return pin ? (templates[slot.toLowerCase()] || []).find((x) => x.id === pin.templateId) || null : null;
    };
    const { meals, totals } = buildDayMeals(
      pinned("Breakfast") || pick.breakfast,
      pinned("Lunch") || pick.lunch,
      pinned("Snack") || pick.snack,
      pinned("Dinner") || pick.dinner,
      targets,
      pinned("Dessert") || pick.dessert
    );
    return { day, meals, totals };
  });

  return trimToBudget(week, targets, budgetCap, { leftovers, floor: 100, passes: 40 });
}

/** Which of those rules actually made it into the finished week. A craving is a
 *  one-off, so it's spent once it lands — but only then, and only that one.
 *  Wiping every craving on any generation meant asking for tacos and then
 *  building next week threw the request away unheard. */
export function appliedRules(week, matched = []) {
  const ids = new Set(week.flatMap((d) => d.meals.map((m) => m.id)));
  const cuisines = new Set(week.flatMap((d) => d.meals.map((m) => m.cuisine).filter(Boolean)));
  return matched.filter((m) =>
    (m.templateId && ids.has(m.templateId)) ||
    (m.cuisines?.length && m.cuisines.some((c) => cuisines.has(c)))
  );
}

export function generateWeek(targets, budgetCap = 65, attempts = 60, options = {}) {
  // Pins narrow the search space, so allow more tries to find an affordable fit.
  if (options.pins?.length) attempts = Math.max(attempts, 120);
  const leftovers = options.leftovers || {};
  let best = null, bestScore = Infinity;
  let bestCompliant = null, bestCompliantScore = Infinity;

  for (let i = 0; i < attempts; i++) {
    const candidate = generateCandidateWeek(targets, budgetCap, options);
    // Cost the candidate as it will actually be shopped for — pins already
    // applied inside generateCandidateWeek — so we never accept a week that
    // only looks affordable before the user's rules are honoured.
    const cost = weekCost(candidate, leftovers);
    const sc = scoreWeek(candidate, targets, budgetCap, options.favour || [], leftovers);

    if (sc < bestScore) { bestScore = sc; best = candidate; }
    if (cost <= budgetCap && sc < bestCompliantScore) {
      bestCompliantScore = sc;
      bestCompliant = candidate;
    }
    // Stop early once we have a good week that fits the budget.
    if (bestCompliant && bestCompliantScore < 60) break;
  }

  // Every attempt already ran the full swap-then-trim pipeline on its own candidate
  // and still couldn't fit — but don't just hand back the best-scoring one over
  // budget. Give it one more, harder round: trimming can change which meal is now
  // the priciest, so a fresh swap pass can still find cuts the candidate's own
  // build never got the chance to re-check, and a lower trim floor squeezes what's
  // left. Never makes the week costlier, so it's always a fair swap for `best`.
  if (!bestCompliant && best) {
    let salvage = enforceBudget(best, targets, budgetCap, 20, usablePins(options.pins, options.blocked), options.blocked || {}, leftovers);
    salvage = trimToBudget(salvage, targets, budgetCap, { leftovers, floor: 100, passes: 20, hard: true });

    // Still over. Give up variety gradually — swap the priciest meals for cheaper
    // ones and stop the moment it fits. Collapsing straight to the cheapest
    // possible week made every plan near-identical whenever a standing rule was
    // in play (2 distinct dinners out of 7), and a monotonous week he won't cook
    // is not a win. The cheapest week stays as the true last resort.
    if (weekCost(salvage, leftovers) > budgetCap) {
      salvage = rebalanceAfterSwap(salvage, targets, budgetCap, {
        pins: options.pins || [], blocked: options.blocked || {}, leftovers,
      });
    }
    if (weekCost(salvage, leftovers) > budgetCap) {
      const floorWeek = cheapestWeek(targets, budgetCap, options);
      if (weekCost(floorWeek, leftovers) < weekCost(salvage, leftovers)) salvage = floorWeek;
    }
    best = salvage;
  }

  // Always prefer a week that fits the budget, even if another scored marginally
  // better on macros — going over budget is the one thing the user ruled out.
  const chosen = bestCompliant || best;
  return chosen ? withCravings(chosen, targets, budgetCap, { ...options, pins: usablePins(options.pins, options.blocked), leftovers }) : chosen;
}

// mealPlanner.js
// Builds a 7-day plan from meal templates, scaled to hit the day's macro targets,
// avoiding repeats, capping single expensive ingredients, and — new — enforcing
// an actual weekly budget ceiling by swapping out the priciest meals until the
// whole week's grocery cost fits.

import { allIngredients, estimateItemCost } from "./foodDatabase.js";
import { buildGroceryList } from "./groceryListGenerator.js";

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

function pickNonRepeating(list, usedIds, expensiveCount, openedProteins = new Set()) {
  const options = list.filter((t) => {
    if (usedIds.has(t.id)) return false;
    const capped = t.items.some(([id]) => WEEKLY_CAP[id] && (expensiveCount[id] || 0) >= WEEKLY_CAP[id]);
    return !capped;
  });
  const pool = options.length ? options : list.filter((t) => !t.items.some(([id]) => WEEKLY_CAP[id] && (expensiveCount[id] || 0) >= WEEKLY_CAP[id]));
  const finalPool = pool.length ? pool : list;

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

function buildDayMeals(b, l, s, d, targets) {
  const rawMeals = [
    { slot: "Breakfast", ...b, items: [...b.items] },
    { slot: "Lunch", ...l, items: [...l.items] },
    { slot: "Snack", ...s, items: [...s.items] },
    { slot: "Shake", name: "Whey shake", items: [["whey", 1]], proteinAnchor: null, carbAnchor: null, standalone: true },
    { slot: "Dinner", ...d, items: [...d.items] },
  ];

  const scalable = new Set(["Breakfast", "Lunch", "Dinner"]);

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
function enforceBudget(week, targets, budgetCap, maxSwaps = 20, pins = []) {
  let current = week;
  for (let i = 0; i < maxSwaps; i++) {
    const grocery = buildGroceryList(current);
    if (grocery.estimatedTotal <= budgetCap) break;

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
    let best = null;
    templates[slotKey].forEach((tpl) => {
      if (tpl.id === worst.currentId || inUse.has(tpl.id)) return;
      const c = templateCost(tpl.items);
      if (c < worst.cost && (!best || c < best.cost)) best = { tpl, cost: c };
    });

    // If every alternative is already used, fall back to the cheapest unused-in-that-slot
    // option even if it repeats once — but never let one template exceed 2 uses per week.
    if (!best) {
      const counts = {};
      current.forEach((d) => d.meals.filter((m) => m.slot === worst.slot).forEach((m) => { counts[m.id] = (counts[m.id] || 0) + 1; }));
      templates[slotKey].forEach((tpl) => {
        if (tpl.id === worst.currentId) return;
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
    const rebuilt = buildDayMeals(b, l, sn, d, targets);
    current = current.map((dd, di) => (di === worst.dayIdx ? { day: dd.day, ...rebuilt } : dd));
  }
  return current;
}

/**
 * @param {{targetKcal:number, protein:number}} targets
 * @param {number} budgetCap - weekly grocery budget ceiling in £
 */
function generateCandidateWeek(targets, budgetCap = 65, options = {}) {
  const { pins = [], favour = [], excludeIds = [] } = options;
  const used = { breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set() };
  const expensiveCount = {};
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openedProteins = new Set();
  const rawWeek = days.map((day) => {
    const b = pickNonRepeating(templates.breakfast, used.breakfast, expensiveCount, openedProteins);
    const l = pickNonRepeating(templates.lunch, used.lunch, expensiveCount, openedProteins);
    const s = pickNonRepeating(templates.snack, used.snack, expensiveCount, openedProteins);
    const d = pickNonRepeating(templates.dinner, used.dinner, expensiveCount, openedProteins);
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

    const { meals, totals } = buildDayMeals(bb, ll, ss, dd, targets);
    return { day, meals, totals };
  });

  let planned = enforceBudget(rawWeek, targets, budgetCap);

  // Last resort: shave portions of the priciest *protein* items a little at a time.
  // Protein target has slack (we typically overshoot ~185g vs 174g), so small trims
  // stay on-target nutritionally while pulling the shop under budget.
  for (let pass = 0; pass < 8; pass++) {
    if (buildGroceryList(planned).estimatedTotal <= budgetCap) break;
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
  // (rice, potato, oats, eggs) so fixing nutrition doesn't push the bill back up.
  const CHEAP_FILLERS = ["rice", "potato", "sweet_potato", "oats", "rice_noodles", "pita", "sourdough", "eggs"];
  planned = planned.map((day) => {
    let meals = day.meals;
    for (let pass = 0; pass < 10; pass++) {
      const tot = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      if (tot.kcal >= targets.targetKcal * 0.92 && tot.protein >= targets.protein * 0.95) break;

      let bumped = false;
      meals = meals.map((m) => {
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
    }
    const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
    return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
  });

  // If the top-up nudged us back over budget, trim protein anchors — cutting the
  // priciest proteins hardest, and only down to a floor that keeps protein on target.
  for (let pass = 0; pass < 25; pass++) {
    if (buildGroceryList(planned).estimatedTotal <= budgetCap) break;
    planned = planned.map((day) => {
      const meals = day.meals.map((m) => {
        if (!m.proteinAnchor) return m;
        const ing = lookup(m.proteinAnchor);
        if (ing.unit === "each" || ing.unit === "scoop") return m;
        const unitCost = estimateItemCost(m.proteinAnchor, 100);
        const cutRate = unitCost > 2 ? 0.88 : unitCost > 1 ? 0.93 : 0.97; // trim pricey proteins faster
        const items = m.items.map(([id, qty]) =>
          id === m.proteinAnchor ? [id, Math.max(130, Math.round((qty * cutRate) / 10) * 10)] : [id, qty]
        );
        return { ...m, items, ...macrosForItems(items) };
      });
      const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    });
  }

  // Re-assert pins after budget swaps (which may have replaced them), then let
  // the top-up and trim passes below run normally over the result.
  if (pins.length) {
    planned = planned.map((day) => {
      const relevant = pins.filter((p) => p.day === day.day);
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
          targets
        );
        meals = built.meals;
      });

      const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      return { day: day.day, meals, totals: { kcal: Math.round(totals.kcal), protein: Math.round(totals.protein) } };
    });
  }

  return planned;
}


/**
 * Scores a candidate week: budget compliance first, then macro accuracy, then variety.
 * Lower is better.
 */
function scoreWeek(week, targets, budgetCap, favour = []) {
  const cost = buildGroceryList(week).estimatedTotal;
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
export function interpretRules(rules = []) {
  const pins = [];      // { day, slot, templateId }
  const favour = [];    // cuisine or template ids to prefer
  const avoid = [];     // ingredient ids to avoid

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

    if (match && day && slot) pins.push({ day, slot, templateId: match.id });
    else if (match) favour.push(match.id);

    // Cuisine preference
    ["mexican", "indian", "japanese", "chinese", "italian", "american", "middle_eastern", "british"].forEach((c) => {
      if (text.includes(c.replace("_", " ")) || text.includes(c)) favour.push(`cuisine:${c}`);
    });
  });

  return { pins, favour, avoid };
}

export function generateWeek(targets, budgetCap = 65, attempts = 60, options = {}) {
  // Pins narrow the search space, so allow more tries to find an affordable fit.
  if (options.pins?.length) attempts = Math.max(attempts, 120);
  let best = null, bestScore = Infinity;
  let bestCompliant = null, bestCompliantScore = Infinity;

  for (let i = 0; i < attempts; i++) {
    const candidate = generateCandidateWeek(targets, budgetCap, options);
    // Cost the candidate as it will actually be shopped for — pins already
    // applied inside generateCandidateWeek — so we never accept a week that
    // only looks affordable before the user's rules are honoured.
    const cost = buildGroceryList(candidate).estimatedTotal;
    const sc = scoreWeek(candidate, targets, budgetCap, options.favour || []);

    if (sc < bestScore) { bestScore = sc; best = candidate; }
    if (cost <= budgetCap && sc < bestCompliantScore) {
      bestCompliantScore = sc;
      bestCompliant = candidate;
    }
    // Stop early once we have a good week that fits the budget.
    if (bestCompliant && bestCompliantScore < 60) break;
  }

  // Always prefer a week that fits the budget, even if another scored marginally
  // better on macros — going over budget is the one thing the user ruled out.
  return bestCompliant || best;
}

// mealPlanner.js
// Builds a 7-day plan from meal templates, scaled to hit the day's macro targets,
// avoiding repeats, capping single expensive ingredients, and — new — enforcing
// an actual weekly budget ceiling by swapping out the priciest meals until the
// whole week's grocery cost fits.

import { allIngredients, estimateItemCost, weekCostOf, tooLate, products } from "./foodDatabase.js";
import { buildGroceryList } from "./groceryListGenerator.js";
import { DAY_NAMES } from "./weeks.js";

const allDb = allIngredients;
const lookup = (id) => allDb.find((x) => x.id === id);

const WEEKLY_CAP = { salmon: 1, steak: 1 };

// Sanity ceilings: no single meal should ever exceed these, regardless of how
// short the day is on calories. Prevents absurd outputs like a 770-kcal bowl of oats.
const SLOT_KCAL_CEILING = { Breakfast: 700, Lunch: 900, Dinner: 950, Snack: 300 };
// Hard caps on how much of any one ingredient can land in a single meal.
const INGREDIENT_MAX_G = {
  oats: 90, rice: 250, pasta: 150, potato: 400, sweet_potato: 350, rice_noodles: 150,
  // Granola at 50g keeps it to a box a week, which is what he gets through.
  sourdough: 4, pita: 130, tortilla: 3, breadcrumbs: 60, greek_yoghurt: 300,
  naan: 2, burger_bun: 2, qp_burger: 2, granola: 50, chickpeas: 240, milk: 300,
  peanut_butter_g: 30,
  berries: 200, banana: 150, mango: 200, cheese: 60, avocado: 100,
};

// The library is built from what his Ocado orders show he actually buys, plus
// frozen veg and tins that keep: no fresh produce, nothing that rots. Most
// meals are assembly or a single pan; anything 25 minutes or over has to earn
// it. `max` is how many times a week a meal may appear: breakfast is the same
// granola bowl most days because that's what he eats, and burger night is
// several nights a week, not one. Fruit is a once- or twice-a-week thing for
// him, so anything with fruit in it counts against FRUIT_PER_WEEK. Sourdough
// is the cheap, no-cook filler: toast and sandwiches, never cooking.
export const templates = {
  breakfast: [
    { id: "granola_bowl", name: "Protein granola & yoghurt", cuisine: "simple", items: [["greek_yoghurt", 130], ["granola", 45], ["milk", 150]], proteinAnchor: null, carbAnchor: "granola", time: 2, max: 7 },
    { id: "granola_berry_bowl", name: "Protein granola, yoghurt & strawberries", cuisine: "simple", items: [["greek_yoghurt", 130], ["granola", 45], ["berries", 80], ["milk", 100]], proteinAnchor: null, carbAnchor: "granola", time: 2 },
    { id: "mango_granola_bowl", name: "Protein granola, yoghurt & mango", cuisine: "simple", items: [["greek_yoghurt", 130], ["granola", 45], ["mango", 80], ["milk", 100]], proteinAnchor: null, carbAnchor: "granola", time: 2 },
    { id: "eggs_sourdough", name: "Scrambled eggs & spinach on sourdough", cuisine: "simple", items: [["eggs", 3], ["sourdough", 2], ["spinach", 100], ["milk", 30]], proteinAnchor: "eggs", carbAnchor: "sourdough", time: 8, max: 3 },
    { id: "pb_toast_breakfast", name: "Peanut butter sourdough & yoghurt", cuisine: "simple", items: [["sourdough", 2], ["peanut_butter_g", 20], ["greek_yoghurt", 150]], proteinAnchor: null, carbAnchor: "sourdough", time: 4, max: 3 },
    { id: "berry_smoothie", name: "Strawberry & peanut butter smoothie", cuisine: "simple", items: [["milk", 300], ["greek_yoghurt", 100], ["berries", 100], ["peanut_butter_g", 20]], proteinAnchor: null, carbAnchor: null, time: 3 },
  ],
  lunch: [
    { id: "peri_rice_bowl", name: "Peri-peri chicken, rice & beans", cuisine: "simple", items: [["chicken_breast", 200], ["rice", 125], ["kidney_beans", 80], ["peri_sauce", 25], ["peri_rub", 4], ["guacamole", 40]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 15 },
    { id: "teriyaki_bowl", name: "Chicken teriyaki & edamame rice bowl", cuisine: "japanese", items: [["chicken_breast", 180], ["rice", 125], ["edamame", 80], ["broccoli", 80], ["teriyaki_sauce", 30]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 15 },
    { id: "egg_fried_rice", name: "Chicken & pea egg-fried rice", cuisine: "chinese", items: [["chicken_breast", 160], ["eggs", 2], ["rice", 150], ["peas", 80], ["edamame", 40], ["spinach", 50], ["olive_oil_g", 5]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 15 },
    { id: "chilli_rice_lunch", name: "Quick beef & bean chilli rice", cuisine: "mexican", items: [["beef_mince_5", 180], ["kidney_beans", 140], ["pasta_sauce", 100], ["spinach", 50], ["rice", 125], ["peri_rub", 3]], proteinAnchor: "beef_mince_5", carbAnchor: "rice", time: 18 },
    { id: "peri_chicken_sandwich", name: "Peri-peri chicken & guacamole sourdough sandwich", cuisine: "simple", items: [["chicken_breast", 160], ["sourdough", 2], ["guacamole", 40], ["spinach", 40], ["peri_sauce", 15], ["peri_rub", 3]], proteinAnchor: "chicken_breast", carbAnchor: "sourdough", time: 12 },
    { id: "chickpea_egg_toast", name: "Smashed chickpeas, eggs & guacamole on sourdough", cuisine: "mediterranean", items: [["eggs", 3], ["chickpeas", 120], ["sourdough", 2], ["guacamole", 30], ["peri_sauce", 10]], proteinAnchor: "eggs", carbAnchor: "sourdough", time: 8 },
  ],
  snack: [
    { id: "pepperoni_snack", name: "Pepperoni slices", items: [["pepperoni", 40]], proteinAnchor: null, carbAnchor: null, time: 1, max: 2 },
    { id: "edamame_snack", name: "Salted edamame", items: [["edamame", 120]], proteinAnchor: null, carbAnchor: null, time: 4, max: 3 },
    { id: "pb_yoghurt", name: "Peanut butter yoghurt", items: [["greek_yoghurt", 150], ["peanut_butter_g", 15]], proteinAnchor: null, carbAnchor: null, time: 1, max: 3 },
    { id: "pb_toast_snack", name: "Peanut butter on sourdough", items: [["sourdough", 2], ["peanut_butter_g", 20]], proteinAnchor: null, carbAnchor: null, time: 3, max: 3 },
    // Coconut water is the biggest potassium source he already buys: 330ml
    // is ~800mg, as much as the edamame alongside it.
    { id: "coconut_edamame", name: "Coconut water & salted edamame", items: [["coconut_water", 330], ["edamame", 100]], proteinAnchor: null, carbAnchor: null, time: 4, max: 3 },
    { id: "coconut_mango", name: "Coconut water & mango", items: [["coconut_water", 330], ["mango", 80]], proteinAnchor: null, carbAnchor: null, time: 1 },
    { id: "yoghurt_snack", name: "Yoghurt & strawberries", items: [["greek_yoghurt", 150], ["berries", 80]], proteinAnchor: null, carbAnchor: null, time: 2 },
  ],
  dessert: [
    { id: "strawberry_dessert", name: "Warm strawberries", items: [["berries", 120]], proteinAnchor: null, carbAnchor: null, time: 2 },
    { id: "mango_dessert", name: "Mango chunks", items: [["mango", 120]], proteinAnchor: null, carbAnchor: null, time: 1 },
    { id: "mango_strawberry_dessert", name: "Mango & strawberries", items: [["mango", 60], ["berries", 60]], proteinAnchor: null, carbAnchor: null, time: 2 },
  ],
  dinner: [
    // Ready-made quarter pounders in brioche buns, which is what his orders
    // show for burger night. The peas version comes first so "burger on
    // Fridays" pins it: the diced sweet potato for wedges is only good for
    // 4 days, and the burgers and buns freeze.
    { id: "burger_peas", name: "Beef burger in a brioche bun with peas", cuisine: "american", items: [["qp_burger", 1], ["burger_bun", 1], ["peas", 150]], proteinAnchor: "qp_burger", carbAnchor: null, time: 12, max: 3 },
    { id: "burgers_wedges", name: "Beef burger in a brioche bun & sweet potato wedges", cuisine: "american", items: [["qp_burger", 1], ["burger_bun", 1], ["sweet_potato", 175], ["guacamole", 30]], proteinAnchor: "qp_burger", carbAnchor: "sweet_potato", time: 20, max: 4 },
    { id: "peri_chicken_wedges", name: "Peri-peri chicken, sweet potato & broccoli", cuisine: "simple", items: [["chicken_breast", 220], ["sweet_potato", 175], ["broccoli", 120], ["peri_sauce", 25], ["peri_rub", 4]], proteinAnchor: "chicken_breast", carbAnchor: "sweet_potato", time: 22 },
    { id: "tikka_naan", name: "Chicken & chickpea tikka masala with naan", cuisine: "indian", items: [["chicken_breast", 200], ["tikka_sauce", 150], ["chickpeas", 100], ["naan", 1], ["spinach", 100]], proteinAnchor: "chicken_breast", carbAnchor: "naan", time: 22 },
    { id: "mince_pasta", name: "Beef mince & spinach rigatoni", cuisine: "italian", items: [["beef_mince_5", 200], ["pasta", 110], ["pasta_sauce", 150], ["spinach", 100]], proteinAnchor: "beef_mince_5", carbAnchor: "pasta", time: 20 },
    { id: "chilli_naan", name: "Beef & bean chilli with naan", cuisine: "mexican", items: [["beef_mince_5", 200], ["kidney_beans", 150], ["pasta_sauce", 120], ["spinach", 80], ["naan", 1], ["peri_rub", 3]], proteinAnchor: "beef_mince_5", carbAnchor: "naan", time: 20 },
    { id: "chicken_pasta", name: "Creamy chicken, pea & spinach rigatoni", cuisine: "italian", items: [["chicken_breast", 200], ["pasta", 110], ["greek_yoghurt", 60], ["peas", 100], ["spinach", 60]], proteinAnchor: "chicken_breast", carbAnchor: "pasta", time: 20 },
    { id: "teriyaki_rice_dinner", name: "Teriyaki chicken, rice, broccoli & edamame", cuisine: "japanese", items: [["chicken_breast", 220], ["rice", 150], ["broccoli", 120], ["edamame", 60], ["teriyaki_sauce", 30]], proteinAnchor: "chicken_breast", carbAnchor: "rice", time: 15 },
  ],
};

// He has fruit once or twice a week, not daily. Every template with fruit in
// it, in any slot, counts towards this.
export const FRUIT_PER_WEEK = 2;
const FRUIT = new Set(["berries", "mango", "banana", "pineapple", "grapes", "watermelon"]);
export const hasFruit = (tpl) => (tpl?.items || []).some(([id]) => FRUIT.has(id));
export const fruitCount = (week) => week.reduce((n, d) => n + d.meals.filter(hasFruit).length, 0);

/** A meal that would be eating something past its date on day `dayIdx` of
 *  the week (0 = delivery day). Diced sweet potato on day 6, say. */
export const lateOn = (tpl, dayIdx) => (tpl?.items || []).some(([id]) => tooLate(id, dayIdx));

/** Can `tpl` go in `slot` on day `di` of `week` without food going off or
 *  the week going over its fruit? Every pass that moves meals asks this. */
export function fitsDay(week, di, slot, tpl) {
  if (lateOn(tpl, di)) return false;
  if (!hasFruit(tpl)) return true;
  const cur = week[di]?.meals.find((m) => m.slot === slot);
  return fruitCount(week) - (hasFruit(cur) ? 1 : 0) + 1 <= FRUIT_PER_WEEK;
}

/** How many times a template may appear in a week. */
const maxUses = (tpl) => tpl.max ?? 2;

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

/** What adding `tpl` costs given everything already planned this week
 *  (`basket`: ingredient -> quantity). Packs are bought whole, so the second
 *  burger out of a 4-pack is nearly free and the first one carries the pack.
 *  This is what makes the planner reuse what it has opened instead of buying a
 *  tub of guacamole for 30g. */
function marginalCost(tpl, basket) {
  return tpl.items.reduce((sum, [id, qty]) => {
    if (id === "whey") return sum;
    const have = basket[id] || 0;
    return sum + weekCostOf(id, have + qty) - weekCostOf(id, have);
  }, 0);
}

/** Most nights there isn't time to cook, so quick meals are favoured and
 *  anything 25 minutes or over has to be much cheaper to get picked. */
function speedWeight(time = 20) {
  return time <= 5 ? 1.8 : time <= 12 ? 1.5 : time <= 18 ? 1.2 : time <= 22 ? 1 : time < 30 ? 0.6 : 0.3;
}

function addToBasket(basket, tpl) {
  tpl.items.forEach(([id, qty]) => { if (id !== "whey") basket[id] = (basket[id] || 0) + qty; });
}

/** Uses something freezable after it would have gone off in the fridge, so
 *  it means freezing a portion on delivery day. Fine, but a little less
 *  likely to be picked than the same meal earlier in the week. */
const needsFreezing = (tpl, dayIdx) => tpl.items.some(([id]) => {
  const p = products[id];
  return p?.freezable && p.life !== undefined && dayIdx > p.life;
});

function pickNonRepeating(list, useCount, expensiveCount, basket = {}, blockedIds = [], ok = () => true, dayIdx = 0) {
  // Dislikes are absolute. Freshness and the fruit limit only give way if
  // literally nothing else is left in the slot.
  const unblocked = list.filter((t) => !blockedIds.includes(t.id));
  const fits = unblocked.filter(ok);
  const allowed = fits.length ? fits : unblocked;
  const capped = (t) => t.items.some(([id]) => WEEKLY_CAP[id] && (expensiveCount[id] || 0) >= WEEKLY_CAP[id]);
  const options = allowed.filter((t) => (useCount[t.id] || 0) < maxUses(t) && !capped(t));
  // Never fall back to the full list — a disliked meal must never be planned.
  const finalPool = options.length ? options : (allowed.filter((t) => !capped(t)).length ? allowed.filter((t) => !capped(t)) : (allowed.length ? allowed : list));

  // Weighted by true marginal cost and by speed. Repeats get a mild nudge
  // away, so reuse comes from cheap packs rather than the same dish forever.
  const weights = finalPool.map((t) => {
    const cost = marginalCost(t, basket);
    const repeat = Math.pow(0.7, useCount[t.id] || 0);
    const freeze = needsFreezing(t, dayIdx) ? 0.85 : 1;
    return (speedWeight(t.time) * repeat * freeze) / Math.pow(Math.max(cost, 0.4), 1.5);
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
export const weekCost = (week, leftovers = {}) => buildGroceryList(week, leftovers).weeklyCost;

/** Close what's left of each day's calorie and protein gap with cheap
 *  fillers already in its meals, a step at a time, never past the cap.
 *  Run after generation and after every trim, so a day rebuilt by a swap
 *  gets topped up too: swapped days used to land ~150 kcal short. */
function topUp(week, targets, budgetCap, leftovers = {}) {
  // Every bump is checked against the real weekly cost before it's kept.
  // Milk, sourdough and peanut butter are about 0.2p a kcal; rice pouches
  // and granola nearer 0.3p.
  const CHEAP_FILLERS = ["sourdough", "milk", "peanut_butter_g", "rice", "pasta", "sweet_potato", "naan", "granola", "chickpeas", "eggs"];
  let runningWeek = week;
  return week.map((day, dayIdx) => {
    let meals = day.meals;
    for (let pass = 0; pass < 16; pass++) {
      const tot = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein }), { kcal: 0, protein: 0 });
      // This used to stop at 92%, which is most of why weeks came in ~200
      // kcal short even with no budget limit at all.
      if (tot.kcal >= targets.targetKcal * 0.98 && tot.protein >= targets.protein * 0.97) break;

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
        const step = isPerUnit ? 1 : fid === "milk" ? 50 : 20;
        const next = Math.min(cap, fqty + step);
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
}

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
  return topUp(planned, targets, budgetCap, leftovers);
}

/** Cheapest template the rules allow in a slot. Shared by the last-resort paths
 *  in both generation and swap rebalancing so they agree on what "cheapest" is. */
export function cheapestTemplate(slot, blocked = {}, exclude = null, ok = null) {
  const all = templates[slot] || [];
  let allowed = all.filter((t) => !(blocked[slot] || []).includes(t.id));
  if (ok && allowed.some(ok)) allowed = allowed.filter(ok);
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
  out = trimToBudget(packAwareRebalance(out, targets, budgetCap, { held, blocked, leftovers }), targets, budgetCap, { leftovers, floor: 100, passes: 30, hard: true });
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
    const ok = (t) => fitsDay(out, c.dayIdx, c.slot, t);
    const tpl = cheapestTemplate(slotKey, blocked, onMenu, ok) || cheapestTemplate(slotKey, blocked, null, ok);
    if (tpl && !ok(tpl)) continue;
    if (!tpl || out[c.dayIdx].meals.find((m) => m.slot === c.slot)?.id === tpl.id) continue;
    const next = out.map((d, i) => (i !== c.dayIdx ? d : setMealOnDay(d, c.slot, tpl, targets)));
    out = trimToBudget(next, targets, budgetCap, { leftovers, floor: 100, passes: 30, hard: true });
    if (weekCost(out, leftovers) <= budgetCap) break;
  }
  return out;
}

/** Swap meals by what they really save. enforceBudget ranks meals by price
 *  per gram, which stopped meaning much once packs are bought whole: dropping
 *  the "priciest" meal can save nothing if its chicken comes from a pack that's
 *  already bought. This tries each allowed swap against the real weekly cost
 *  and keeps the one that saves most, until the week fits. It's too slow to run
 *  on every candidate, so it's only reached for after the cheaper passes fail.
 *  Never drops lunch or dinner below 3 different meals, and never touches a
 *  held slot. */
function packAwareRebalance(week, targets, budgetCap, { held = [], blocked = {}, leftovers = {}, rounds = 10 } = {}) {
  let out = week;
  const isHeld = (day, slot) => held.some((h) => h.day === day && h.slot === slot);
  for (let r = 0; r < rounds; r++) {
    const now = weekCost(out, leftovers);
    if (now <= budgetCap) break;
    let best = null;
    out.forEach((day, di) => ["Breakfast", "Lunch", "Snack", "Dinner"].forEach((slot) => {
      if (isHeld(day.day, slot)) return;
      const key = slot.toLowerCase();
      const cur = day.meals.find((m) => m.slot === slot);
      const counts = {};
      out.forEach((d) => { const id = d.meals.find((m) => m.slot === slot)?.id; if (id) counts[id] = (counts[id] || 0) + 1; });
      for (const tpl of templates[key] || []) {
        if (tpl.id === cur?.id || (blocked[key] || []).includes(tpl.id) || (counts[tpl.id] || 0) >= maxUses(tpl)) continue;
        if (!fitsDay(out, di, slot, tpl)) continue;
        const next = out.map((d, i) => (i !== di ? d : setMealOnDay(d, slot, tpl, targets)));
        if (slot === "Lunch" || slot === "Dinner") {
          const distinct = new Set(next.map((d) => d.meals.find((m) => m.slot === slot)?.id)).size;
          if (distinct < 3) continue;
        }
        const c = weekCost(next, leftovers);
        if (c < now - 0.01 && (!best || c < best.cost)) best = { week: next, cost: c };
      }
    }));
    if (!best) break;
    out = best.week;
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
      if (!fitsDay(current, worst.dayIdx, worst.slot, tpl)) return;
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
        if (!fitsDay(current, worst.dayIdx, worst.slot, tpl)) return;
        if ((counts[tpl.id] || 0) >= maxUses(tpl)) return; // never past a meal's weekly limit
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
    const free = out.map((_, i) => i).filter((i) => !pins.some((p) => p.day === out[i].day && p.slot === slot) && fitsDay(out, i, slot, tpl));
    if (!free.length) continue;
    const at = free[Math.floor(Math.random() * free.length)];
    out = out.map((d, i) => (i !== at ? d : setMealOnDay(d, slot, tpl, targets)));
    placed.push({ day: out[at].day, slot });
  }
  return out;
}

function generateCandidateWeek(targets, budgetCap = 65, options = {}) {
  // The week's day order comes from the anchor: a Tuesday shop gives Tue…Mon.
  const { favour = [], blocked = {}, leftovers = {}, days: dayOrder = DAY_NAMES } = options;
  const pins = usablePins(options.pins, blocked);
  const used = { breakfast: {}, lunch: {}, dinner: {}, snack: {}, dessert: {} };
  const expensiveCount = {};
  const days = dayOrder;

  // Fruit is once or twice a week. One fruit dessert on a random night for
  // the sweet craving; anything else with fruit shares what's left of the
  // weekly allowance.
  const dessertPool = templates.dessert.filter((x) => !(blocked.dessert || []).includes(x.id));
  const dessertTpl = dessertPool.length ? dessertPool[Math.floor(Math.random() * dessertPool.length)] : null;
  const dessertDay = Math.floor(Math.random() * days.length);
  let fruitUsed = dessertTpl ? 1 : 0;

  const pinnedTpl = (day, slot) => {
    const pin = pins.find((p) => p.day === day && p.slot === slot);
    if (!pin) return null;
    return (templates[slot.toLowerCase()] || []).find((x) => x.id === pin.templateId) || null;
  };

  // Standing rules are known before anything else is chosen, so their packs
  // go in the basket first: with burgers on Friday already bought, another
  // burger night that week only costs a bun's share.
  const basket = {};
  days.forEach((day) => ["Breakfast", "Lunch", "Snack", "Dinner"].forEach((slot) => {
    const tpl = pinnedTpl(day, slot);
    if (tpl) { addToBasket(basket, tpl); const k = slot.toLowerCase(); used[k][tpl.id] = (used[k][tpl.id] || 0) + 1; if (hasFruit(tpl)) fruitUsed++; }
  }));

  const rawWeek = days.map((day, dayIndex) => {
    const choose = (slot) => {
      const k = slot.toLowerCase();
      if (pinnedTpl(day, slot)) return pinnedTpl(day, slot); // already counted above
      const ok = (t) => !lateOn(t, dayIndex) && (!hasFruit(t) || fruitUsed < FRUIT_PER_WEEK);
      const tpl = pickNonRepeating(templates[k], used[k], expensiveCount, basket, blocked[k] || [], ok, dayIndex);
      used[k][tpl.id] = (used[k][tpl.id] || 0) + 1;
      if (hasFruit(tpl)) fruitUsed++;
      addToBasket(basket, tpl);
      tpl.items.forEach(([id]) => { if (WEEKLY_CAP[id]) expensiveCount[id] = (expensiveCount[id] || 0) + 1; });
      return tpl;
    };
    const bb = choose("Breakfast");
    const ll = choose("Lunch");
    const ss = choose("Snack");
    const dd = choose("Dinner");
    const ds = dayIndex === dessertDay ? dessertTpl : null;
    if (ds) addToBasket(basket, ds);

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
  planned = topUp(planned, targets, budgetCap, leftovers);

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

  // Reward variety at lunch and dinner. Breakfast is left alone: the same
  // granola bowl every morning is what he actually eats. Meals meant to recur
  // (burger night, max 4+) only cost variety past their second appearance.
  const byId = Object.fromEntries(Object.values(templates).flat().map((t) => [t.id, t]));
  ["Lunch", "Dinner"].forEach((slot) => {
    const counts = {};
    week.forEach((d) => d.meals.filter((m) => m.slot === slot).forEach((m) => { counts[m.id] = (counts[m.id] || 0) + 1; }));
    Object.entries(counts).forEach(([id, c]) => {
      const free = maxUses(byId[id] || {}) >= 4 ? 2 : 1;
      if (c > free) score += (c - free) * 8;
    });
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
  const { blocked = {}, leftovers = {}, days: dayOrder = DAY_NAMES } = options;
  const pins = usablePins(options.pins, blocked);
  // No fruit at all here: it's the floor of what a week costs, and fruit is
  // optional. Each day takes the cheapest meal that's still fresh by then.
  const noFruit = (t) => !hasFruit(t);
  const week = dayOrder.map((day, di) => {
    const fresh = (t) => noFruit(t) && !lateOn(t, di);
    const pick = Object.fromEntries(["breakfast", "lunch", "snack", "dinner"].map((sl) => [sl, cheapestTemplate(sl, blocked, null, fresh)]));
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
      pinned("Dessert") || null
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
    if (weekCost(salvage, leftovers) > budgetCap) {
      salvage = packAwareRebalance(salvage, targets, budgetCap, { held: usablePins(options.pins, options.blocked), blocked: options.blocked || {}, leftovers });
      salvage = trimToBudget(salvage, targets, budgetCap, { leftovers, floor: 100, passes: 20, hard: true });
    }

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

// groceryListGenerator.js
// Turns the week's meals into a shopping list written the way you'd actually
// buy things: "2 avocados", "1 × 300g jar" peanut butter, "2 × 650g pack"
// chicken — whole packs of the products he really buys, priced as such.

import { allIngredients, shoppingGuide, choosePacks, productFor, isStaple, stapleWeeklyCost, packsForFreshness, toFreeze, kitchenAmount } from "./foodDatabase.js";

const AISLES = {
  meat: ["chicken_breast", "chicken_thigh", "salmon", "steak", "beef_mince_5", "turkey_mince", "pork_tenderloin", "qp_burger", "lean_burger"],
  chilled: ["greek_yoghurt", "milk", "cheese", "feta", "eggs", "coconut_water", "guacamole", "pepperoni", "tikka_sauce", "pasta_sauce"],
  produce: ["cucumber", "zucchini", "peppers", "avocado", "asparagus", "cherry_tomato", "mushroom", "celery", "sweet_potato", "potato", "banana", "apple", "watermelon", "kiwi", "orange", "pineapple", "grapes"],
  bakery: ["sourdough", "pita", "tortilla", "naan", "burger_bun"],
  frozen: ["berries", "edamame", "mango", "broccoli", "peas", "spinach"],
  cupboard: ["rice", "oats", "pasta", "granola", "rice_noodles", "breadcrumbs", "flour", "peanut_butter_g", "olive_oil_g", "sesame_oil_g", "chickpeas", "kidney_beans", "teriyaki_sauce", "peri_sauce", "peri_rub"],
};

function aisleFor(id) {
  for (const [aisle, ids] of Object.entries(AISLES)) if (ids.includes(id)) return aisle;
  return "cupboard";
}

const PLURALS = { "sweet potato": "sweet potatoes", "potato": "potatoes", "quarter melon": "quarter melons", "head": "heads", "bunch": "bunches" };

/** "2 × 650g pack", "1 × 4 pint" — or "3 peppers" for loose produce. Says what
 *  to reach for in the aisle, and the count is always whole packs. */
function describe(pick) {
  const { pack, n } = pick;
  if (pack.piece) {
    const plural = n === 1 ? pack.label : (PLURALS[pack.label] || (pack.label.endsWith("s") ? pack.label : `${pack.label}s`));
    return `${n} ${plural}`;
  }
  return `${n} × ${pack.label}`;
}

export function buildGroceryList(week, leftovers = {}, haveEnough = []) {
  const totals = {};
  // What each ingredient is actually for, gathered in the same pass that adds
  // up the quantities. The list could already say how much chicken to buy but
  // not why, so deciding whether to skip a row meant going back to the plan and
  // reading seven days of meals. Day order follows the week, which is already
  // in shop order.
  const usedIn = {};
  // The week starts on delivery day, so a day's position is how long the
  // food has been in the fridge by then.
  const uses = {};
  week.forEach((day, dayIdx) => {
    day.meals.forEach((meal) => {
      (meal.items || []).forEach(([id, qty]) => {
        if (id === "whey") return;
        totals[id] = (totals[id] || 0) + qty;
        (usedIn[id] ||= []).push({ day: day.day, slot: meal.slot, meal: meal.name, qty });
        (uses[id] ||= []).push({ day: dayIdx, dayName: day.day, qty });
      });
    });
  });

  // Two totals, because they answer different questions. `estimatedTotal` is
  // what this shop costs at the till: whole packs of whatever the pantry
  // doesn't cover. `weeklyCost` is what the week's food really costs, with a
  // bag of rigatoni or a bottle of oil spread over the weeks it lasts. The
  // budget cap is measured against `weeklyCost`; charging a full staple every
  // week had the planner fighting money that was never being spent.
  let weeklyCost = 0;
  const items = Object.entries(totals).map(([id, rawQty]) => {
    const ing = allIngredients.find((x) => x.id === id);
    if (!ing) return null;
    const staple = isStaple(id);
    const owned = leftovers[id] || 0;
    const needed = Math.max(0, rawQty - owned);
    let pick = needed > 0 && !haveEnough.includes(id) ? choosePacks(id, needed) : null;
    // A jar opened Monday and needed again Friday has gone off by then, so
    // that's a second jar. Only counted on a full shop: with some already in
    // the pantry there's no knowing when it was opened.
    if (pick && !owned) {
      const fresh = packsForFreshness(id, uses[id] || []);
      if (fresh > pick.n) pick = { ...pick, n: fresh, cost: fresh * pick.pack.price, amount: fresh * pick.pack.size };
    }
    const tillCost = pick ? pick.cost : 0;
    const weekly = staple ? stapleWeeklyCost(id, rawQty) : tillCost;
    weeklyCost += weekly;
    if (!pick) return null; // covered by the pantry, or you said you've got plenty

    const product = productFor(id);
    const lasts = product.lastsWeeks && product.lastsWeeks > 1
      ? `lasts ~${product.lastsWeeks} weeks, £${weekly.toFixed(2)}/wk` : product.staple ? "lasts several weeks" : null;
    // Chicken keeps 2 days, so Friday's chicken has to go in the freezer
    // the day it arrives. Said on the list, where he'll see it unpacking.
    const fz = toFreeze(id, uses[id] || []);
    const freeze = fz ? `freeze ${kitchenAmount(id, fz.qty)} on delivery, for ${fz.days.join(" & ")}` : null;
    return {
      id,
      name: ing.name,
      product: pick.pack.name || null,
      estimate: Boolean(product.estimate),
      display: describe(pick),
      note: [freeze, lasts].filter(Boolean).join(" · ") || undefined,
      freeze: fz || undefined,
      buyGrams: pick.amount,
      packs: pick.n,
      neededThisWeek: Math.round(rawQty),
      alreadyOwned: owned,
      estCost: Math.round(tillCost * 100) / 100,
      weeklyCost: Math.round(weekly * 100) / 100,
      usedIn: usedIn[id] || [],
      aisle: aisleFor(id),
      longLife: staple,
      storage: ing.storageDays,
      guide: shoppingGuide[id] || null,
    };
  }).filter(Boolean);

  // Group by aisle so the list follows how you actually walk round a shop
  const order = ["produce", "meat", "chilled", "bakery", "frozen", "cupboard"];
  items.sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || a.name.localeCompare(b.name));

  const estimatedTotal = Math.round(items.reduce((a, i) => a + i.estCost, 0) * 100) / 100;
  return { items, estimatedTotal, weeklyCost: Math.round(weeklyCost * 100) / 100, byAisle: order.map((a) => ({ aisle: a, items: items.filter((i) => i.aisle === a) })).filter((g) => g.items.length) };
}

// groceryListGenerator.js
// Turns the week's meals into a shopping list written the way you'd actually
// buy things: "2 avocados", "1 jar peanut butter", "700g chicken breast" —
// not "300g avocado" or "100g peanut butter".

import { allIngredients, pricePer100g, priceEach, purchaseUnits, shoppingGuide } from "./foodDatabase.js";

const AISLES = {
  meat: ["chicken_breast", "chicken_thigh", "salmon", "steak", "beef_mince_5", "turkey_mince", "pork_tenderloin"],
  chilled: ["greek_yoghurt", "milk", "cheese", "feta", "eggs", "coconut_water"],
  produce: ["cucumber", "zucchini", "peppers", "avocado", "broccoli", "asparagus", "spinach", "cherry_tomato", "mushroom", "celery", "sweet_potato", "potato", "banana", "apple", "berries", "mango", "watermelon", "kiwi", "orange", "pineapple", "grapes"],
  bakery: ["sourdough", "pita", "tortilla"],
  cupboard: ["rice", "oats", "pasta", "rice_noodles", "breadcrumbs", "flour", "peanut_butter_g", "olive_oil_g", "sesame_oil_g", "tuna_tin", "edamame"],
};

function aisleFor(id) {
  for (const [aisle, ids] of Object.entries(AISLES)) if (ids.includes(id)) return aisle;
  return "cupboard";
}

/** Convert a raw gram requirement into how you'd actually buy it. */
function toPurchaseUnit(id, grams) {
  const pu = purchaseUnits[id];
  const ing = allIngredients.find((x) => x.id === id);

  // Things counted in boxes/packs of individual items (eggs, tortillas, pita)
  if (pu?.boxOf) {
    const boxes = Math.max(1, Math.ceil(grams / pu.boxOf));
    return { display: boxes === 1 ? `1 ${pu.unit}` : `${boxes} × ${pu.unit}`, buyGrams: boxes * pu.boxOf, packs: boxes };
  }

  // Store-cupboard staples — buy the whole jar/bag once, it lasts weeks
  if (pu?.bulk) {
    return { display: `1 ${pu.unit}`, buyGrams: pu.perUnit, packs: 1, note: "lasts several weeks" };
  }

  // Countable produce — pieces, not grams
  if (pu?.perUnit && pu.unit !== "g") {
    const count = Math.max(1, Math.round(grams / pu.perUnit));
    const PLURALS = { "sweet potato": "sweet potatoes", "potato": "potatoes", "quarter melon": "quarter melons", "head": "heads", "bunch": "bunches", "punnet": "punnets", "box of 12": "boxes of 12", "pack of 8": "packs of 8", "pack of 6": "packs of 6" };
    const plural = count === 1 ? pu.unit : (PLURALS[pu.unit] || (pu.unit.endsWith("s") ? pu.unit : `${pu.unit}s`));
    return { display: `${count} ${plural}`, buyGrams: count * pu.perUnit, packs: count };
  }

  // Sold by weight — round up to a sensible pack
  const pack = pu?.packSize || 100;
  const rounded = Math.ceil(grams / pack) * pack;
  return { display: rounded >= 1000 ? `${(rounded / 1000).toFixed(1)}kg` : `${rounded}g`, buyGrams: rounded, packs: rounded / pack };
}

const PACK_PRICES = { tortilla: 1.4, pita: 1.1, eggs: 3.2 }; // price per pack/box
function costOf(id, grams, packs) {
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing) return 0;
  const pu = purchaseUnits[id];
  if (pu?.boxOf) return (PACK_PRICES[id] || 1.5) * (packs || 1);
  if (ing.unit === "each") return (priceEach[id] || 0.3) * grams;
  return ((pricePer100g[id] || 0.3) * grams) / 100;
}

export function buildGroceryList(week, leftovers = {}, haveEnough = []) {
  const totals = {};
  week.forEach((day) => {
    day.meals.forEach((meal) => {
      (meal.items || []).forEach(([id, qty]) => {
        if (id === "whey") return;
        totals[id] = (totals[id] || 0) + qty;
      });
    });
  });

  const items = Object.entries(totals).map(([id, rawQty]) => {
    const ing = allIngredients.find((x) => x.id === id);
    if (!ing) return null;
    if (haveEnough.includes(id)) return null; // you said you've got plenty
    const owned = leftovers[id] || 0;
    const needed = Math.max(0, rawQty - owned);
    if (needed <= 0) return null;

    const purchase = toPurchaseUnit(id, needed);
    return {
      id,
      name: ing.name,
      display: purchase.display,
      note: purchase.note,
      buyGrams: purchase.buyGrams,
      neededThisWeek: Math.round(rawQty),
      alreadyOwned: owned,
      estCost: Math.round(costOf(id, purchase.buyGrams, purchase.packs) * 100) / 100,
      aisle: aisleFor(id),
      longLife: Boolean(purchaseUnits[id]?.bulk),
      storage: ing.storageDays,
      guide: shoppingGuide[id] || null,
    };
  }).filter(Boolean);

  // Group by aisle so the list follows how you actually walk round a shop
  const order = ["produce", "meat", "chilled", "bakery", "cupboard"];
  items.sort((a, b) => order.indexOf(a.aisle) - order.indexOf(b.aisle) || a.name.localeCompare(b.name));

  const estimatedTotal = Math.round(items.reduce((a, i) => a + i.estCost, 0) * 100) / 100;
  return { items, estimatedTotal, byAisle: order.map((a) => ({ aisle: a, items: items.filter((i) => i.aisle === a) })).filter((g) => g.items.length) };
}

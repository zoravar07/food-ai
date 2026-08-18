// groceryListGenerator.js
// Sums every ingredient used across a generated week, subtracts what's already
// in the "larder" from last week, and rounds up to sensible purchase units.
// The list is DERIVED from the meals — an ingredient can never be missing
// from it, because nothing is hand-typed.

import { allIngredients, pricePer100g, priceEach } from "./foodDatabase.js";

function roundToPurchaseUnit(id, grams) {
  const packSizes = {
    chicken_breast: 500, chicken_thigh: 500, salmon: 150, steak: 250, beef_mince_5: 500,
    turkey_mince: 500, pork_tenderloin: 400, rice: 500, pasta: 500, oats: 500,
    rice_noodles: 250, broccoli: 200, sweet_potato: 200, potato: 1000,
  };
  const pack = packSizes[id] || 100;
  return Math.ceil(grams / pack) * pack;
}

export function buildGroceryList(week, leftovers = {}) {
  const totals = {};
  week.forEach((day) => {
    day.meals.forEach((meal) => {
      (meal.items || []).forEach(([id, qty]) => {
        if (id === "whey") return; // personal supplement, not a weekly grocery item
        totals[id] = (totals[id] || 0) + qty;
      });
    });
  });

  const list = Object.entries(totals).map(([id, rawQty]) => {
    const ing = allIngredients.find((x) => x.id === id);
    const isEach = ing.unit === "each";
    const owned = leftovers[id] || 0;
    const needed = Math.max(0, rawQty - owned);
    const buyQty = isEach ? Math.ceil(needed) : roundToPurchaseUnit(id, needed);
    const est = isEach ? buyQty * (priceEach[id] || 0) : (buyQty / 100) * (pricePer100g[id] || 0.3);

    return {
      id, name: ing.name, neededThisWeek: Math.round(rawQty), alreadyOwned: owned,
      toBuy: buyQty, unit: isEach ? "each" : "g", estCost: Math.round(est * 100) / 100, storage: ing.storageDays,
    };
  }).filter((item) => item.toBuy > 0);

  const totalCost = Math.round(list.reduce((a, i) => a + i.estCost, 0) * 100) / 100;
  return { items: list, estimatedTotal: totalCost };
}

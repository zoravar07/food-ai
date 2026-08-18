// foodDatabase.js
// Structured ingredient data. Macros are per 100g raw unless noted.
// storageDays = { fridge, freezer } — used to power the "what's in the larder" feature.
// Corn intentionally excluded (disliked). No allergies on file.

export const proteins = [
  { id: "chicken_breast", name: "Chicken breast", kcal: 165, protein: 31, carbs: 0, fat: 3.6, storageDays: { fridge: 2, freezer: 270 }, tags: ["versatile"] },
  { id: "chicken_thigh", name: "Chicken thigh", kcal: 209, protein: 26, carbs: 0, fat: 10.9, storageDays: { fridge: 2, freezer: 270 }, tags: ["versatile", "juicy"] },
  { id: "salmon", name: "Salmon fillet", kcal: 208, protein: 20, carbs: 0, fat: 13, storageDays: { fridge: 1, freezer: 90 }, tags: ["omega3"] },
  { id: "steak", name: "Sirloin steak", kcal: 206, protein: 29, carbs: 0, fat: 9, storageDays: { fridge: 3, freezer: 180 }, tags: ["treat"] },
  { id: "beef_mince_5", name: "Beef mince (5% fat)", kcal: 137, protein: 22, carbs: 0, fat: 5, storageDays: { fridge: 2, freezer: 120 }, tags: ["versatile"] },
  { id: "turkey_mince", name: "Turkey mince", kcal: 120, protein: 21, carbs: 0, fat: 3.5, storageDays: { fridge: 2, freezer: 120 }, tags: ["lean"] },
  { id: "eggs", name: "Eggs", kcal: 143, protein: 13, carbs: 1, fat: 10, unit: "each", kcalPerUnit: 78, proteinPerUnit: 6.5, storageDays: { fridge: 21, freezer: 0 }, tags: ["breakfast"] },
  { id: "pork_tenderloin", name: "Pork tenderloin", kcal: 143, protein: 26, carbs: 0, fat: 3.5, storageDays: { fridge: 3, freezer: 180 }, tags: ["lean", "new"] },
  { id: "whey", name: "Whey protein (1 scoop ~30g)", kcal: 120, protein: 24, carbs: 3, fat: 1.5, unit: "scoop", storageDays: { fridge: 0, freezer: 0 }, tags: ["standalone_only"] },
];

export const pantry = [
  { id: "breadcrumbs", name: "Breadcrumbs / panko", kcal: 395, protein: 13, carbs: 72, fat: 5, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "flour", name: "Plain flour", kcal: 364, protein: 10, carbs: 76, fat: 1, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "cheese", name: "Cheddar cheese", kcal: 402, protein: 25, carbs: 1.3, fat: 33, storageDays: { fridge: 21, freezer: 180 } },
  { id: "tortilla", name: "Flour tortilla", kcal: 289, protein: 8, carbs: 48, fat: 7, storageDays: { fridge: 10, freezer: 90 } },
];

export const carbs = [
  { id: "rice", name: "Jasmine/basmati rice", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "potato", name: "Potato", kcal: 87, protein: 2, carbs: 20, fat: 0.1, storageDays: { fridge: 21, freezer: 0 } },
  { id: "sweet_potato", name: "Sweet potato", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, storageDays: { fridge: 14, freezer: 0 } },
  { id: "pasta", name: "Pasta", kcal: 131, protein: 5, carbs: 25, fat: 1.1, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 730 },
  { id: "pita", name: "Pita / flatbread", kcal: 275, protein: 9, carbs: 55, fat: 1.2, storageDays: { fridge: 5, freezer: 90 } },
  { id: "sourdough", name: "Sourdough", kcal: 289, protein: 9, carbs: 56, fat: 2, storageDays: { fridge: 5, freezer: 90 } },
  { id: "oats", name: "Oats", kcal: 389, protein: 17, carbs: 66, fat: 7, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "rice_noodles", name: "Rice noodles", kcal: 109, protein: 1.8, carbs: 25, fat: 0.2, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
];

export const veg = [
  { id: "broccoli", name: "Broccoli", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, storageDays: { fridge: 7, freezer: 240 } },
  { id: "asparagus", name: "Asparagus", kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1, storageDays: { fridge: 4, freezer: 240 } },
  { id: "spinach", name: "Spinach / leafy greens", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, storageDays: { fridge: 5, freezer: 240 } },
  { id: "cucumber", name: "Cucumber", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, storageDays: { fridge: 7, freezer: 0 } },
  { id: "zucchini", name: "Zucchini / courgette", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "peppers", name: "Bell peppers", kcal: 31, protein: 1, carbs: 6, fat: 0.3, storageDays: { fridge: 10, freezer: 240 } },
  { id: "cherry_tomato", name: "Cherry tomatoes", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, storageDays: { fridge: 7, freezer: 0 } },
  { id: "mushroom", name: "Mushroom", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "celery", name: "Celery", kcal: 16, protein: 0.7, carbs: 3, fat: 0.2, storageDays: { fridge: 14, freezer: 0 } },
  { id: "edamame", name: "Edamame", kcal: 121, protein: 12, carbs: 8.9, fat: 5, storageDays: { fridge: 0, freezer: 300 } },
  { id: "avocado", name: "Avocado", kcal: 160, protein: 2, carbs: 8.5, fat: 15, storageDays: { fridge: 5, freezer: 0 } },
];

export const fruit = [
  { id: "berries", name: "Mixed berries", kcal: 50, protein: 0.8, carbs: 12, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "watermelon", name: "Watermelon", kcal: 30, protein: 0.6, carbs: 8, fat: 0.2, storageDays: { fridge: 7, freezer: 0 } },
  { id: "banana", name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, storageDays: { fridge: 5, freezer: 60 } },
  { id: "apple", name: "Apple", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, storageDays: { fridge: 21, freezer: 0 } },
  { id: "mango", name: "Mango", kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, storageDays: { fridge: 5, freezer: 240 } },
];

export const dairy = [
  { id: "greek_yoghurt", name: "Greek yoghurt", kcal: 97, protein: 9, carbs: 3.6, fat: 5, storageDays: { fridge: 10, freezer: 0 } },
  { id: "feta", name: "Feta", kcal: 264, protein: 14, carbs: 4, fat: 21, storageDays: { fridge: 14, freezer: 0 } },
];

export const sauces = [
  { id: "soy", name: "Soy sauce", tags: ["chinese", "japanese"], pantryLife: 730 },
  { id: "tahini", name: "Tahini", tags: ["middle_eastern", "mediterranean"], pantryLife: 365 },
  { id: "chilli_flakes", name: "Chilli flakes", tags: ["all"], pantryLife: 730 },
  { id: "curry_paste", name: "Curry paste", tags: ["indian"], pantryLife: 180 },
  { id: "salsa", name: "Salsa", tags: ["mexican"], pantryLife: 14 },
  { id: "sesame_oil", name: "Sesame oil", tags: ["chinese", "japanese"], pantryLife: 365 },
  { id: "teriyaki", name: "Teriyaki glaze", tags: ["japanese"], pantryLife: 180 },
  { id: "peanut_butter", name: "Peanut butter", tags: ["breakfast", "snack"], pantryLife: 180 },
  { id: "honey", name: "Honey", tags: ["breakfast", "all"], pantryLife: 1000 },
];

// Disliked / excluded — the planner must never select these
export const excluded = ["corn"];

export const fats = [
  { id: "peanut_butter_g", name: "Peanut butter", kcal: 588, protein: 25, carbs: 20, fat: 50, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 180 },
  { id: "olive_oil_g", name: "Olive oil", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 540 },
  { id: "sesame_oil_g", name: "Sesame oil", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "tuna_tin", name: "Tuna tin (~145g drained)", kcal: 116, protein: 26, carbs: 0, fat: 1, unit: "each", kcalPerUnit: 116, proteinPerUnit: 26, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 730 },
];

export const allIngredients = [...proteins, ...carbs, ...veg, ...fruit, ...dairy, ...pantry, ...fats];

// Rough UK price estimates — per 100g unless the ingredient is unit-priced (eggs).
export const pricePer100g = {
  chicken_breast: 0.9, chicken_thigh: 0.7, salmon: 2.2, steak: 2.6, beef_mince_5: 1.1,
  turkey_mince: 1.0, pork_tenderloin: 1.3, rice: 0.15, potato: 0.1, sweet_potato: 0.2,
  pasta: 0.12, pita: 0.3, sourdough: 0.35, oats: 0.15, rice_noodles: 0.35,
  broccoli: 0.25, asparagus: 0.7, spinach: 0.4, cucumber: 0.2, zucchini: 0.3,
  peppers: 0.5, cherry_tomato: 0.5, mushroom: 0.4, celery: 0.2, edamame: 0.6,
  avocado: 0.8, berries: 1.2, watermelon: 0.15, banana: 0.2, apple: 0.25, mango: 0.4,
  greek_yoghurt: 0.35, feta: 1.0, breadcrumbs: 0.35, peanut_butter_g: 0.6, olive_oil_g: 0.7, sesame_oil_g: 1.2, flour: 0.15, cheese: 0.9, tortilla: 0.45,
};
export const priceEach = { eggs: 0.28, tuna_tin: 1.1 };

export function estimateItemCost(id, qty) {
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing || id === "whey") return 0;
  if (ing.unit === "each") return (priceEach[id] || 0) * qty;
  return ((pricePer100g[id] || 0.3) * qty) / 100;
}

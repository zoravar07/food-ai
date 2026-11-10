// foodDatabase.js
// Structured ingredient data. Macros are per 100g raw unless noted.
// storageDays = { fridge, freezer } — used to power the "what's in the larder" feature.
// Corn intentionally excluded (disliked). No allergies on file.

export const proteins = [
  { id: "chicken_breast", name: "Chicken breast", kcal: 165, protein: 31, carbs: 0, fat: 3.6, potassium: 256, storageDays: { fridge: 2, freezer: 270 }, tags: ["versatile"] },
  { id: "chicken_thigh", name: "Chicken thigh", kcal: 209, protein: 26, carbs: 0, fat: 10.9, potassium: 229, storageDays: { fridge: 2, freezer: 270 }, tags: ["versatile", "juicy"] },
  { id: "salmon", name: "Salmon fillet", kcal: 208, protein: 20, carbs: 0, fat: 13, potassium: 363, storageDays: { fridge: 1, freezer: 90 }, tags: ["omega3"] },
  { id: "steak", name: "Sirloin steak", kcal: 206, protein: 29, carbs: 0, fat: 9, storageDays: { fridge: 3, freezer: 180 }, tags: ["treat"] },
  { id: "beef_mince_5", name: "Beef mince (5% fat)", kcal: 137, protein: 22, carbs: 0, fat: 5, potassium: 318, storageDays: { fridge: 2, freezer: 120 }, tags: ["versatile"] },
  { id: "turkey_mince", name: "Turkey mince", kcal: 120, protein: 21, carbs: 0, fat: 3.5, storageDays: { fridge: 2, freezer: 120 }, tags: ["lean"] },
  { id: "eggs", name: "Eggs", kcal: 143, protein: 13, carbs: 1, fat: 10, potassium: 126, unit: "each", gPerUnit: 55, kcalPerUnit: 78, proteinPerUnit: 6.5, storageDays: { fridge: 21, freezer: 0 }, tags: ["breakfast"] },
  // Ready-made patties, which is what he actually buys for burger night, not mince.
  { id: "qp_burger", name: "Quarter pounder beef burger", kcal: 257, protein: 26, carbs: 3.3, fat: 15, fibre: 0.5, potassium: 300, unit: "each", gPerUnit: 113.5, kcalPerUnit: 292, proteinPerUnit: 29.5, storageDays: { fridge: 3, freezer: 90 }, tags: ["treat"] },
  { id: "lean_burger", name: "Lean beef burger (3% fat)", kcal: 121, protein: 19.4, carbs: 4.4, fat: 2.8, potassium: 300, unit: "each", gPerUnit: 150, kcalPerUnit: 182, proteinPerUnit: 29.1, storageDays: { fridge: 3, freezer: 90 }, tags: ["lean"] },
  // Bought as a snack on its own, never cooked into a meal.
  { id: "pepperoni", name: "Sliced pepperoni", kcal: 479, protein: 22, carbs: 1, fat: 43, potassium: 300, storageDays: { fridge: 21, freezer: 0 }, tags: ["snack"] },
  { id: "pork_tenderloin", name: "Pork tenderloin", kcal: 143, protein: 26, carbs: 0, fat: 3.5, storageDays: { fridge: 3, freezer: 180 }, tags: ["lean", "new"] },
  { id: "whey", name: "Whey protein (1 scoop ~30g)", kcal: 120, protein: 24, carbs: 3, fat: 1.5, unit: "scoop", storageDays: { fridge: 0, freezer: 0 }, tags: ["standalone_only"] },
];

export const pantry = [
  { id: "breadcrumbs", name: "Breadcrumbs / panko", kcal: 395, protein: 13, carbs: 72, fat: 5, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "flour", name: "Plain flour", kcal: 364, protein: 10, carbs: 76, fat: 1, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "cheese", name: "Cheddar cheese", kcal: 402, protein: 25, carbs: 1.3, fat: 33, storageDays: { fridge: 21, freezer: 180 } },
  { id: "tortilla", name: "Flour tortilla", kcal: 289, protein: 8, carbs: 48, fat: 7, unit: "each", gPerUnit: 50, kcalPerUnit: 145, proteinPerUnit: 4, storageDays: { fridge: 10, freezer: 90 } },
];

export const carbs = [
  // Quantities are cooked weight, which is how a microwave pouch is sold (250g).
  { id: "rice", name: "Microwave basmati rice", kcal: 155, protein: 3.2, carbs: 31, fat: 1.9, fibre: 0.6, potassium: 35, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 270 },
  { id: "potato", name: "Potato", kcal: 87, protein: 2, carbs: 20, fat: 0.1, fibre: 2.2, potassium: 425, storageDays: { fridge: 21, freezer: 0 } },
  { id: "sweet_potato", name: "Sweet potato", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fibre: 3, potassium: 337, storageDays: { fridge: 14, freezer: 0 } },
  { id: "pasta", name: "Rigatoni", kcal: 131, protein: 5, carbs: 25, fat: 1.1, fibre: 1.8, potassium: 44, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 730 },
  { id: "pita", name: "Pita / flatbread", kcal: 275, protein: 9, carbs: 55, fat: 1.2, unit: "each", gPerUnit: 60, kcalPerUnit: 165, proteinPerUnit: 5.5, storageDays: { fridge: 5, freezer: 90 } },
  // Jason's The Great White, which he's started buying. Counted in slices:
  // a 450g loaf is about 7 (Ocado label). Potassium isn't on the label, so
  // it's a typical white sourdough figure.
  { id: "sourdough", name: "Sourdough", kcal: 237, protein: 9.7, carbs: 46.4, fat: 0.7, fibre: 3.0, potassium: 120, sodium: 320, unit: "each", gPerUnit: 64, kcalPerUnit: 152, proteinPerUnit: 6.2, storageDays: { fridge: 5, freezer: 30 } },
  { id: "oats", name: "Oats", kcal: 389, protein: 17, carbs: 66, fat: 7, fibre: 10, potassium: 429, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "naan", name: "Plain naan", kcal: 271, protein: 7.9, carbs: 48, fat: 4.5, fibre: 2.5, potassium: 120, unit: "each", gPerUnit: 120, kcalPerUnit: 325, proteinPerUnit: 9.5, storageDays: { fridge: 5, freezer: 90 } },
  { id: "burger_bun", name: "Brioche burger bun", kcal: 313, protein: 9.3, carbs: 52, fat: 6.8, fibre: 2.5, potassium: 120, unit: "each", gPerUnit: 62.5, kcalPerUnit: 196, proteinPerUnit: 5.8, storageDays: { fridge: 5, freezer: 90 } },
  { id: "granola", name: "High-protein granola", kcal: 416, protein: 21, carbs: 44, fat: 15, fibre: 18, potassium: 450, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 180 },
  { id: "rice_noodles", name: "Rice noodles", kcal: 109, protein: 1.8, carbs: 25, fat: 0.2, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
];

export const veg = [
  // He doesn't buy fresh veg, so the veg he'll actually eat is frozen: no
  // waste, microwaves in minutes.
  { id: "broccoli", name: "Frozen broccoli florets", kcal: 34, protein: 2.8, carbs: 4, fat: 0.4, fibre: 2.6, potassium: 316, storageDays: { fridge: 2, freezer: 365 } },
  { id: "peas", name: "Frozen garden peas", kcal: 71, protein: 5.4, carbs: 9.7, fat: 0.8, fibre: 5.1, potassium: 244, storageDays: { fridge: 2, freezer: 365 } },
  { id: "asparagus", name: "Asparagus", kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1, storageDays: { fridge: 4, freezer: 240 } },
  { id: "spinach", name: "Frozen leaf spinach", kcal: 23, protein: 2.9, carbs: 1.1, fat: 0.4, fibre: 2.2, potassium: 466, storageDays: { fridge: 2, freezer: 365 } },
  { id: "cucumber", name: "Cucumber", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fibre: 0.5, potassium: 147, storageDays: { fridge: 7, freezer: 0 } },
  { id: "zucchini", name: "Zucchini / courgette", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "peppers", name: "Bell peppers", kcal: 31, protein: 1, carbs: 6, fat: 0.3, fibre: 2.1, potassium: 211, storageDays: { fridge: 10, freezer: 240 } },
  { id: "cherry_tomato", name: "Cherry tomatoes", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fibre: 1.2, potassium: 237, storageDays: { fridge: 7, freezer: 0 } },
  { id: "mushroom", name: "Mushroom", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "celery", name: "Celery", kcal: 16, protein: 0.7, carbs: 3, fat: 0.2, storageDays: { fridge: 14, freezer: 0 } },
  { id: "edamame", name: "Frozen edamame beans", kcal: 142, protein: 13, carbs: 3.6, fat: 6.6, fibre: 5, potassium: 436, storageDays: { fridge: 2, freezer: 365 } },
  // Tinned pulses: drained weight. Cheapest fibre there is.
  { id: "chickpeas", name: "Chickpeas (tinned)", kcal: 122, protein: 6.4, carbs: 14, fat: 2.7, fibre: 8.1, potassium: 172, storageDays: { fridge: 2, freezer: 0 }, pantryLife: 730 },
  { id: "kidney_beans", name: "Red kidney beans (tinned)", kcal: 100, protein: 6.9, carbs: 13.5, fat: 0.6, fibre: 6.7, potassium: 300, storageDays: { fridge: 2, freezer: 0 }, pantryLife: 730 },
  { id: "guacamole", name: "Guacamole", kcal: 158, protein: 2.1, carbs: 2, fat: 14, fibre: 6.8, potassium: 400, storageDays: { fridge: 3, freezer: 0 } },
  { id: "avocado", name: "Avocado", kcal: 160, protein: 2, carbs: 8.5, fat: 15, fibre: 6.7, potassium: 485, storageDays: { fridge: 5, freezer: 0 } },
];

export const fruit = [
  { id: "kiwi", name: "Kiwi", kcal: 61, protein: 1.1, carbs: 15, fat: 0.5, fibre: 3, potassium: 312, storageDays: { fridge: 14, freezer: 0 } },
  { id: "orange", name: "Orange", kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fibre: 2.4, potassium: 181, storageDays: { fridge: 21, freezer: 0 } },
  { id: "pineapple", name: "Pineapple", kcal: 50, protein: 0.5, carbs: 13, fat: 0.1, fibre: 1.4, potassium: 109, storageDays: { fridge: 5, freezer: 180 } },
  { id: "grapes", name: "Grapes", kcal: 69, protein: 0.7, carbs: 18, fat: 0.2, fibre: 0.9, potassium: 191, storageDays: { fridge: 7, freezer: 0 } },
  { id: "berries", name: "Frozen strawberries", kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fibre: 2, potassium: 153, storageDays: { fridge: 2, freezer: 240 } },
  { id: "watermelon", name: "Watermelon", kcal: 30, protein: 0.6, carbs: 8, fat: 0.2, storageDays: { fridge: 7, freezer: 0 } },
  { id: "banana", name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fibre: 2.6, potassium: 358, storageDays: { fridge: 5, freezer: 60 } },
  { id: "apple", name: "Apple", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, storageDays: { fridge: 21, freezer: 0 } },
  { id: "mango", name: "Frozen mango chunks", kcal: 52, protein: 0.7, carbs: 10, fat: 0.6, fibre: 1.6, potassium: 168, storageDays: { fridge: 2, freezer: 365 } },
];

export const dairy = [
  { id: "milk", name: "Milk (semi-skimmed)", kcal: 50, protein: 3.6, carbs: 4.8, fat: 1.8, potassium: 150, storageDays: { fridge: 7, freezer: 0 } },
  { id: "coconut_water", name: "Coconut water", kcal: 19, protein: 0.7, carbs: 3.7, fat: 0.2, potassium: 250, storageDays: { fridge: 5, freezer: 0 } },
  // The Estate Dairy 10% label: the 10% is fat, not protein.
  { id: "greek_yoghurt", name: "Greek yoghurt", kcal: 166, protein: 9.8, carbs: 4.6, fat: 10.6, potassium: 141, storageDays: { fridge: 10, freezer: 0 } },
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

// Sauces and rubs that go into meals. The `sauces` list above is flavour tags
// only; these have macros and prices so they show up on the shop.
export const cookingSauces = [
  { id: "tikka_sauce", name: "Tikka masala sauce", kcal: 71, protein: 1.6, carbs: 8.3, fat: 3.2, fibre: 1.5, potassium: 200, storageDays: { fridge: 3, freezer: 0 } },
  { id: "pasta_sauce", name: "Tomato pasta sauce", kcal: 41, protein: 1.5, carbs: 6.8, fat: 0.5, fibre: 1.5, potassium: 300, storageDays: { fridge: 5, freezer: 0 } },
  { id: "teriyaki_sauce", name: "Teriyaki sauce", kcal: 110, protein: 3, carbs: 22, fat: 1, storageDays: { fridge: 28, freezer: 0 }, pantryLife: 365 },
  { id: "peri_sauce", name: "Peri-peri sauce", kcal: 72, protein: 0.9, carbs: 4.4, fat: 5.6, storageDays: { fridge: 42, freezer: 0 }, pantryLife: 365 },
  { id: "peri_rub", name: "Peri-peri seasoning rub", kcal: 250, protein: 8, carbs: 40, fat: 5, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
];

// Disliked / excluded — the planner must never select these
export const excluded = ["corn"];

export const fats = [
  { id: "peanut_butter_g", name: "Peanut butter", kcal: 588, protein: 25, carbs: 20, fat: 50, fibre: 6, potassium: 649, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 180 },
  { id: "olive_oil_g", name: "Olive oil spray", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 540 },
  { id: "sesame_oil_g", name: "Sesame oil", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
];

export const allIngredients = [...proteins, ...carbs, ...veg, ...fruit, ...dairy, ...pantry, ...fats, ...cookingSauces];



// How each ingredient is ACTUALLY bought in a UK supermarket.
// unit: what you ask for at the shop. perUnit: grams in one of them (for maths).
export const purchaseUnits = {
  // Meat & fish — genuinely sold by weight
  chicken_breast: { unit: "g", packSize: 500, label: "pack" },
  chicken_thigh:  { unit: "g", packSize: 500, label: "pack" },
  salmon:         { unit: "fillet", perUnit: 150 },
  steak:          { unit: "steak", perUnit: 250 },
  beef_mince_5:   { unit: "g", packSize: 500, label: "pack" },
  pork_tenderloin:{ unit: "g", packSize: 400, label: "pack" },
  eggs:           { unit: "box of 12", perUnit: 1, boxOf: 12 },

  // Veg — bought as pieces or bags, never weighed out
  cucumber:     { unit: "cucumber", perUnit: 300 },
  zucchini:     { unit: "courgette", perUnit: 200 },
  peppers:      { unit: "pepper", perUnit: 160 },
  avocado:      { unit: "avocado", perUnit: 150 },
  broccoli:     { unit: "head", perUnit: 350 },
  asparagus:    { unit: "bunch", perUnit: 200 },
  spinach:      { unit: "bag", perUnit: 250, size: "250g" },
  cherry_tomato:{ unit: "punnet", perUnit: 250, size: "250g" },
  mushroom:     { unit: "punnet", perUnit: 250, size: "250g" },
  celery:       { unit: "bunch", perUnit: 400 },
  sweet_potato: { unit: "sweet potato", perUnit: 250 },
  potato:       { unit: "bag", perUnit: 2000, size: "2kg" },

  // Fruit
  banana:     { unit: "banana", perUnit: 120 },
  kiwi:       { unit: "kiwi", perUnit: 75 },
  orange:     { unit: "orange", perUnit: 140 },
  pineapple:  { unit: "pineapple", perUnit: 900 },
  grapes:     { unit: "punnet", perUnit: 400, size: "400g" },
  apple:      { unit: "apple", perUnit: 180 },
  berries:    { unit: "punnet", perUnit: 250, size: "250g" },
  mango:      { unit: "mango", perUnit: 300 },
  watermelon: { unit: "quarter melon", perUnit: 1500 },

  // Store cupboard — buy the jar/bag once, lasts weeks
  peanut_butter_g: { unit: "jar", perUnit: 340, size: "340g", bulk: true },
  olive_oil_g:     { unit: "bottle", perUnit: 500, size: "500ml", bulk: true },
  sesame_oil_g:    { unit: "bottle", perUnit: 250, size: "250ml", bulk: true },
  rice:            { unit: "bag", perUnit: 1000, size: "1kg", bulk: true },
  oats:            { unit: "bag", perUnit: 1000, size: "1kg", bulk: true },
  pasta:           { unit: "bag", perUnit: 500, size: "500g", bulk: true },
  rice_noodles:    { unit: "pack", perUnit: 250, size: "250g", bulk: true },
  breadcrumbs:     { unit: "pack", perUnit: 200, size: "200g", bulk: true },
  flour:           { unit: "bag", perUnit: 1000, size: "1kg", bulk: true },

  // Chilled
  greek_yoghurt: { unit: "tub", perUnit: 1000, size: "1kg" },
  milk:          { unit: "bottle", perUnit: 2000, size: "2L" },
  coconut_water: { unit: "carton", perUnit: 1000, size: "1L" },
  cheese:        { unit: "block", perUnit: 250, size: "250g" },
  feta:          { unit: "block", perUnit: 200, size: "200g" },
  tortilla:      { unit: "pack of 8", perUnit: 1, boxOf: 8 },
  pita:          { unit: "pack of 6", perUnit: 1, boxOf: 6 },
  edamame:       { unit: "frozen bag", perUnit: 500, size: "500g", bulk: true },
};

// Plain-English shopping guidance. What good looks like, what to avoid.
export const shoppingGuide = {
  avocado: {
    pick: "Hold it in your palm and press gently near the stem. It should give a little, like pressing the tip of your nose. That's ripe.",
    avoid: "Rock hard means it won't be ready for days. Mushy or dented means it's already gone brown inside. If the little stem cap falls off easily and it's brown underneath, leave it.",
  },
  banana: {
    pick: "Yellow with a bit of green at the ends if you want them to last the week. Fully yellow with small brown freckles if you're eating them in the next day or two.",
    avoid: "Big black patches or a smell coming off them — those are only good for baking.",
  },
  berries: {
    pick: "Look at the bottom of the punnet through the plastic. It should be dry and clean.",
    avoid: "Any juice stains or squashed fruit at the bottom, or a white fuzzy bit on any berry. One mouldy one spreads to the rest in a day.",
  },
  cucumber: {
    pick: "Firm all the way along, dark green, no soft spots.",
    avoid: "Bendy ends or yellowing skin. Yellow means it's old and will taste bitter.",
  },
  zucchini: {
    pick: "Small to medium, firm, shiny skin. Smaller ones taste better.",
    avoid: "Huge ones — they go watery and seedy. Any wrinkly or soft patches.",
  },
  peppers: {
    pick: "Heavy for their size, tight shiny skin, firm green stalk.",
    avoid: "Wrinkles, soft spots, or a dried-out looking stalk.",
  },
  broccoli: {
    pick: "Tight dark green florets, firm stalk.",
    avoid: "Yellowing florets or a rubbery stalk — that's old and will taste bitter.",
  },
  asparagus: {
    pick: "Firm straight spears with tight closed tips.",
    avoid: "Tips that look wet, mushy or are starting to open up. Dried-out woody ends.",
  },
  spinach: {
    pick: "Bright green, dry leaves. Give the bag a gentle squeeze — should feel light and loose.",
    avoid: "Any slimy or dark wet leaves in the bag. It'll turn the whole bag within a day.",
  },
  cherry_tomato: {
    pick: "Deep colour, taut skin, still on the vine if you can — they taste better and last longer.",
    avoid: "Split skins or wrinkles. Never keep them in the fridge, it kills the flavour.",
  },
  mushroom: {
    pick: "Dry, firm, closed underneath.",
    avoid: "Slimy patches or dark wet spots. Store in paper, not plastic — plastic makes them sweat.",
  },
  sweet_potato: {
    pick: "Firm all over, smooth skin, no soft ends.",
    avoid: "Sprouting, wrinkly skin, or soft dark patches.",
  },
  potato: {
    pick: "Firm with no green tinge.",
    avoid: "Green skin or sprouting eyes — cut those bits off or don't buy it. Keep them dark or they go green.",
  },
  mango: {
    pick: "Squeeze gently — slight give like a ripe avocado. Smell the stem end; it should smell sweet.",
    avoid: "Rock hard (needs days), or wrinkly and leaking. Colour doesn't tell you much, go by feel and smell.",
  },
  kiwi: {
    pick: "Press gently — a little give means ready to eat. Firm ones ripen on the counter in a few days.",
    avoid: "Mushy spots or wrinkled skin. Rock hard is fine if you're not eating it tonight.",
  },
  orange: {
    pick: "Heavy for its size — that means juicy. Skin should be firm with a slight give.",
    avoid: "Light ones feel hollow and will be dry. Soft or mouldy patches near the top.",
  },
  pineapple: {
    pick: "Smell the base — it should smell sweet. Tug a leaf from the middle; if it comes out with a little resistance, it's ripe.",
    avoid: "No smell at all means underripe. A fermented or boozy smell means it's gone over.",
  },
  grapes: {
    pick: "Firmly attached to green, bendy stems. A dusty white bloom on the skin is a good sign, not dirt.",
    avoid: "Brown brittle stems, or loose grapes rolling around the bottom of the bag.",
  },
  watermelon: {
    pick: "Heavy for its size with a creamy yellow patch where it sat on the ground. Tap it — should sound hollow.",
    avoid: "White or missing ground patch means it was picked too early and will taste of nothing.",
  },
  apple: {
    pick: "Firm with no bruises, smells faintly sweet.",
    avoid: "Soft spots or wrinkly skin around the stem.",
  },
  celery: {
    pick: "Tight straight stalks, crisp leaves.",
    avoid: "Limp bendy stalks or yellow leaves.",
  },
  salmon: {
    pick: "Bright pink-orange, firm, no gaps in the flesh. Should smell of the sea, not fishy.",
    avoid: "Dull grey edges, browning, or a strong fishy smell. Use within 2 days or freeze it the day you buy it.",
  },
  chicken_breast: { pick: "Pale pink, plump, no grey.", avoid: "Grey tinge, slimy feel or a sour smell. Freeze anything you won't cook in 2 days." },
  chicken_thigh:  { pick: "Pink with a bit of fat marbling — that's what keeps it juicy.", avoid: "Grey patches or sliminess." },
  steak:          { pick: "Deep red with white fat running through it. Thicker cuts are more forgiving to cook.", avoid: "Brown-grey colour or yellow fat." },
  beef_mince_5:   { pick: "Bright red on the outside.", avoid: "Brown or grey throughout, or liquid pooling in the pack." },
  eggs:           { pick: "Open the box and check none are cracked.", avoid: "Any cracks at all." },
  greek_yoghurt:  { pick: "Buy the biggest tub — much cheaper per gram and you use it daily.", avoid: "Anything labelled 'Greek style' if you want the protein; real Greek yoghurt has roughly double." },
};

// Rough UK price estimates — per 100g unless the ingredient is unit-priced (eggs).
// Only used now for things that have never turned up in one of his orders;
// anything he actually buys is priced from `products` below.
export const pricePer100g = {
  chicken_breast: 0.9, chicken_thigh: 0.7, salmon: 2.2, steak: 2.6, beef_mince_5: 1.1,
  turkey_mince: 1.0, pork_tenderloin: 1.3, rice: 0.15, potato: 0.1, sweet_potato: 0.2,
  pasta: 0.12, pita: 0.3, sourdough: 0.35, oats: 0.15, rice_noodles: 0.35,
  broccoli: 0.25, asparagus: 0.7, spinach: 0.4, cucumber: 0.2, zucchini: 0.3,
  peppers: 0.5, cherry_tomato: 0.5, mushroom: 0.4, celery: 0.2, edamame: 0.6,
  avocado: 0.8, berries: 1.2, watermelon: 0.15, banana: 0.2, apple: 0.25, mango: 0.4,
  greek_yoghurt: 0.28, feta: 1.0, kiwi: 0.5, orange: 0.25, pineapple: 0.3, grapes: 0.6, milk: 0.09, coconut_water: 0.25, breadcrumbs: 0.35, peanut_butter_g: 0.6, olive_oil_g: 0.7, sesame_oil_g: 1.2, flour: 0.15, cheese: 0.9, tortilla: 0.45,
};
export const priceEach = { eggs: 0.28 };

// What he actually buys, taken from his Ocado orders (27 Sep – 3 Nov 2026).
// `size` is in the ingredient's own unit: grams (ml count as grams), or for an
// ingredient counted `each`, how many come in the pack.
//   fixed       the same product every order
//   otherwise   a category: `packs` are the products he switches between and
//               `default` is the one to plan around
//   lastsWeeks  a cupboard staple opened once and used across several weeks.
//               Its weekly cost is the pack spread over that many weeks, not
//               the whole pack every week.
//   life        last day it's still good, counted from delivery (day 0).
//               From Ocado's "Life Xd+" guarantee, which excludes delivery
//               day, or from what he's told me when Ocado doesn't say.
//   freezable   can go in the freezer on delivery day, so a meal after
//               `life` is fine as long as the list says to freeze it.
//   opened      days a pack keeps once opened. Uses spread wider than that
//               need another pack, and the list buys it.
//   checked     false where the price or macros came from a web lookup rather
//               than one of his receipts or a label — worth a look on Ocado.
export const products = {
  chicken_breast: { fixed: true, life: 2, freezable: true, packs: [{ name: "Ocado British Chicken Breast Fillets", size: 650, price: 4.90, label: "650g pack" }] },
  beef_mince_5:   { fixed: true, life: 7, packs: [{ name: "Ocado Fresher For Longer Lean Beef Steak Mince 5%", size: 500, price: 5.05, label: "500g pack" }] },
  eggs:           { fixed: true, packs: [{ name: "Ocado Medium Free Range Eggs", size: 12, price: 2.95, label: "box of 12" }] },
  qp_burger:      { fixed: true, life: 5, freezable: true, packs: [{ name: "Ocado 4 Quarter Pounder Beef Burgers", size: 4, price: 4.15, label: "pack of 4" }] },
  lean_burger:    { fixed: true, packs: [{ name: "M&S Grill 2 Beef Burgers 3% Fat", size: 2, price: 5.00, label: "pack of 2" }] },
  granola:        { fixed: true, lastsWeeks: 1, packs: [{ name: "Surreal High Protein Chocolate Hazelnut Granola", size: 300, price: 4.00, label: "300g box" }] },
  pepperoni:      { fixed: true, packs: [{ name: "Properoni Sliced Pepperoni", size: 80, price: 2.70, label: "80g pack" }] },
  // Label says eat once opened; the day after is as far as it goes.
  guacamole:      { fixed: true, life: 7, opened: 1, packs: [{ name: "Holy Moly Guacamole Jalapeño & Red Pepper", size: 150, price: 2.50, label: "150g tub" }] },
  peanut_butter_g:{ fixed: true, lastsWeeks: 2, packs: [{ name: "Pip & Nut Crunchy Peanut Butter", size: 300, price: 3.50, label: "300g jar" }] },
  // Frozen and tinned keep for weeks, so like a cupboard staple they're costed
  // by what's used rather than the whole bag.
  broccoli:       { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Broccoli Florets", size: 1000, price: 1.30, label: "1kg bag" }] },
  peas:           { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Garden Peas", size: 910, price: 1.55, label: "910g bag" }] },
  spinach:        { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Leaf Spinach", size: 900, price: 1.70, label: "900g bag" }] },
  edamame:        { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Edamame Beans", size: 600, price: 2.80, label: "600g bag" }] },
  mango:          { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Mango Chunks", size: 500, price: 3.10, label: "500g bag" }] },
  // An opened tin of beans keeps a couple of days in the fridge, so these
  // are bought per use.
  chickpeas:      { fixed: true, opened: 2, packs: [{ name: "Ocado Chickpeas in Water", size: 240, price: 0.42, label: "400g tin" }] },
  kidney_beans:   { fixed: true, opened: 2, packs: [{ name: "Ocado Red Kidney Beans in Water", size: 240, price: 0.39, label: "400g tin" }] },
  sweet_potato:   { fixed: true, life: 4, packs: [{ name: "Ocado Diced Sweet Potato", size: 350, price: 1.70, label: "350g pack" }] },
  berries:        { fixed: true, staple: true, packs: [{ name: "Ocado Frozen Strawberries", size: 350, price: 3.10, label: "350g bag" }] },
  olive_oil_g:    { fixed: true, lastsWeeks: 3, packs: [{ name: "Filippo Berio Extra Virgin Olive Oil Spray", size: 200, price: 5.00, label: "200ml spray" }] },
  peri_rub:       { fixed: true, lastsWeeks: 1.5, packs: [{ name: "Nando's Hot Seasoning Rub", size: 25, price: 1.00, label: "25g sachet" }] },

  milk: { default: 1, packs: [
    { name: "Semi-skimmed milk 2 pint", size: 1136, price: 1.20, label: "2 pint" },
    { name: "Semi-skimmed milk 4 pint", size: 2272, price: 1.75, label: "4 pint" },
  ] },
  // Innocent has been half price for his last four orders; £4.30 is the shelf
  // price, so a week costs about £2 more when the offer ends.
  // Opened, a carton keeps about 3 days (the usual label; not checked).
  coconut_water: { default: 0, opened: 3, packs: [
    { name: "Innocent Coconut Water 1L", size: 1000, price: 2.15, regular: 4.30, label: "1L carton" },
    { name: "Vita Coco Coconut Water 1L", size: 1000, price: 4.00, label: "1L carton" },
  ] },
  greek_yoghurt: { default: 0, life: 7, packs: [
    { name: "The Estate Dairy 10% Greek Style Natural Yoghurt", size: 1000, price: 3.85, regular: 4.50, label: "1kg tub" },
    { name: "Odysea Organic Greek Yoghurt 2%", size: 1000, price: 5.00, label: "1kg tub" },
  ] },
  burger_bun: { default: 0, life: 7, freezable: true, packs: [{ name: "Warburtons 4 Seeded Brioche Burger Buns", size: 4, price: 2.00, regular: 2.85, label: "pack of 4" }] },
  // A different brand each time, £1.00–£1.55. 2–3 weeks a bag.
  pasta: { default: 0, lastsWeeks: 2.5, packs: [{ name: "Rigatoni 500g (any brand)", size: 500, price: 1.28, label: "500g bag" }] },
  rice: { default: 0, checked: false, packs: [{ name: "Ocado Microwave Pure Basmati Rice", size: 250, price: 1.00, label: "250g pouch" }] },
  // Ocado guarantees 3 days; he finds a loaf lasts about 5. Not marked
  // freezable on purpose: he wants it eaten fresh, not a loaf spread over
  // ten days.
  sourdough: { default: 0, life: 4, packs: [{ name: "Jason's The Great White Sourdough", size: 7, price: 2.20, label: "450g loaf" }] },
  naan: { default: 0, checked: false, life: 5, freezable: true, packs: [{ name: "Ocado 2 Plain Naans", size: 2, price: 1.45, label: "pack of 2" }] },

  // Sauces: he gets through one every week or two, so bottles are spread
  // over 1.5 weeks. A jar of curry or pasta sauce doesn't keep once opened
  // (3 days is the usual label, not checked against these jars), so those
  // are bought per use.
  tikka_sauce:    { default: 0, opened: 3, packs: [{ name: "Patak's Tikka Masala Curry Sauce", size: 450, price: 2.65, label: "450g jar" }] },
  pasta_sauce:    { default: 0, checked: false, opened: 3, packs: [{ name: "Dolmio Bolognese Smooth Tomato Sauce", size: 450, price: 2.60, label: "450g jar" }] },
  teriyaki_sauce: { default: 0, checked: false, lastsWeeks: 1.5, packs: [{ name: "Kikkoman Toasted Sesame Teriyaki Sauce", size: 250, price: 3.35, label: "250ml bottle" }] },
  peri_sauce:     { default: 0, checked: false, lastsWeeks: 1.5, packs: [{ name: "Nando's Peri-Peri Sauce Medium", size: 500, price: 4.50, label: "500g bottle" }] },
};

/** Plan at shelf prices instead of current offers. Used by the validation
 *  sweep to show the cap still holds when an offer ends. */
export const pricing = { regular: false };

/** The product for an ingredient. Anything he has never bought is built from
 *  the old estimate tables, so the whole app prices through one path. */
export function productFor(id) {
  if (products[id]) {
    const p = { default: 0, ...products[id] };
    return pricing.regular ? { ...p, packs: p.packs.map((pk) => ({ ...pk, price: pk.regular ?? pk.price })) } : p;
  }
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing || id === "whey") return null;
  const pu = purchaseUnits[id];
  const per100 = pricePer100g[id] ?? 0.3;
  const PACK_PRICES = { tortilla: 1.4, pita: 1.1 };
  let pack;
  if (ing.unit === "each") {
    const size = pu?.boxOf || 1;
    pack = { size, price: PACK_PRICES[id] ?? (priceEach[id] ?? 0.3) * size, label: pu?.unit || "each", piece: !pu?.boxOf };
  } else if (pu?.packSize) {
    pack = { size: pu.packSize, price: (per100 * pu.packSize) / 100, label: `${pu.packSize}g pack` };
  } else if (pu?.perUnit) {
    pack = { size: pu.perUnit, price: (per100 * pu.perUnit) / 100, label: pu.size ? `${pu.size} ${pu.unit}` : pu.unit, piece: !pu.size };
  } else {
    pack = { size: 500, price: per100 * 5, label: "500g pack" };
  }
  return { default: 0, estimate: true, staple: Boolean(pu?.bulk), packs: [pack] };
}

/** Bought once and used across weeks (rigatoni, oil spray, peanut butter). */
export function isStaple(id) {
  const p = productFor(id);
  return Boolean(p && (p.lastsWeeks || p.staple));
}

/** Price per gram (or per item, for ingredients counted `each`) of the
 *  product he'd normally pick. */
export function unitPrice(id) {
  const p = productFor(id);
  if (!p) return 0;
  const pk = p.packs[p.default] || p.packs[0];
  return pk.price / pk.size;
}

/** Whole packs to cover `need`, choosing whichever product in the category
 *  does it cheapest — so a week that needs a litre of milk gets the 2 pint,
 *  and anything more gets the 4 pint. Ties go to the default. Weighed things
 *  get 3% slack so 1.31kg of chicken doesn't become a third pack. */
export function choosePacks(id, need) {
  const p = productFor(id);
  if (!p || need <= 0) return null;
  const ing = allIngredients.find((x) => x.id === id);
  const slack = ing?.unit === "each" ? 0 : 0.03;
  let best = null;
  p.packs.forEach((pk, i) => {
    const n = Math.max(1, Math.ceil(need / pk.size - slack));
    const cost = n * pk.price;
    const better = !best || cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && i === p.default);
    if (better) best = { pack: pk, n, cost, amount: n * pk.size };
  });
  return best;
}

/** What one week of using `used` of a staple really costs: the pack spread
 *  over the weeks it lasts, or what was eaten, whichever is more. */
export function stapleWeeklyCost(id, used) {
  const p = productFor(id);
  if (!p || used <= 0) return 0;
  const pk = p.packs[p.default] || p.packs[0];
  const byUse = used * (pk.price / pk.size);
  return p.lastsWeeks ? Math.max(byUse, pk.price / p.lastsWeeks) : byUse;
}

/** What `qty` of an ingredient adds to a week's cost: whole packs for fresh
 *  things, usage for staples. Same rule as the grocery list's weeklyCost, so
 *  the planner and the list can't disagree about what something costs. */
export function weekCostOf(id, qty) {
  if (id === "whey" || qty <= 0) return 0;
  if (isStaple(id)) return stapleWeeklyCost(id, qty);
  return choosePacks(id, qty)?.cost || 0;
}

/** True when a meal using `id` on `day` (days since delivery) would be
 *  eating it off. Freezable things are never too late: the list says to
 *  freeze them on delivery instead. */
export function tooLate(id, day) {
  const p = products[id];
  return Boolean(p && p.life !== undefined && !p.freezable && day > p.life);
}

/** How many packs the week needs once opened packs going off is counted.
 *  `uses` is [{day, qty}]. A pack is opened on its first use and anything
 *  more than `opened` days later needs a fresh one, so two jars of tikka
 *  sauce a week apart cost two jars, not one. */
export function packsForFreshness(id, uses) {
  const p = productFor(id);
  if (!p?.opened || !uses.length) return 0;
  const size = (p.packs[p.default] || p.packs[0]).size;
  let packs = 0, openedOn = -Infinity, left = 0;
  [...uses].sort((a, b) => a.day - b.day).forEach(({ day, qty }) => {
    let q = qty;
    if (day - openedOn > p.opened) left = 0;           // what's left has gone off
    while (q > 1e-9) {
      if (left <= 1e-9) { packs++; openedOn = day; left = size; }
      const take = Math.min(q, left); q -= take; left -= take;
    }
  });
  return packs;
}

/** What has to go in the freezer on delivery day: anything freezable that a
 *  meal uses after it would have gone off in the fridge. */
export function toFreeze(id, uses) {
  const p = products[id];
  if (!p?.freezable || p.life === undefined) return null;
  const late = uses.filter((u) => u.day > p.life);
  if (!late.length) return null;
  return { qty: late.reduce((a, u) => a + u.qty, 0), days: [...new Set(late.map((u) => u.dayName))] };
}

export function estimateItemCost(id, qty) {
  if (id === "whey") return 0;
  return unitPrice(id) * qty;
}

// Turn a gram amount into something you can actually measure in a kitchen.
// Nobody weighs out 47g of oats — they use a cup. Nobody weighs cheese slices.
export const kitchenUnits = {
  oats:            { per: 90,  one: "cup", half: true },
  rice:            { per: 185, one: "cup", half: true },
  pasta:           { per: 100, one: "serving", half: true },
  milk:            { per: 240, one: "cup", half: true },
  greek_yoghurt:   { per: 245, one: "cup", half: true },
  coconut_water:   { per: 240, one: "cup", half: true },
  peanut_butter_g: { per: 16,  one: "tbsp" },
  olive_oil_g:     { per: 14,  one: "tbsp" },
  sesame_oil_g:    { per: 14,  one: "tbsp" },
  breadcrumbs:     { per: 108, one: "cup", half: true },
  flour:           { per: 125, one: "cup", half: true },
  cheese:          { per: 20,  one: "slice" },
  feta:            { per: 30,  one: "chunk" },
  banana:          { per: 118, one: "banana" },
  kiwi:            { per: 75,  one: "kiwi" },
  orange:          { per: 140, one: "orange" },
  pineapple:       { per: 165, one: "cup of chunks" },
  grapes:          { per: 150, one: "handful" },
  apple:           { per: 182, one: "apple" },
  avocado:         { per: 150, one: "avocado", half: true },
  cucumber:        { per: 300, one: "cucumber", half: true },
  zucchini:        { per: 200, one: "courgette", half: true },
  peppers:         { per: 160, one: "pepper", half: true },
  sweet_potato:    { per: 250, one: "sweet potato", half: true },
  potato:          { per: 213, one: "potato", half: true },
  berries:         { per: 145, one: "cup", half: true },
  mango:           { per: 165, one: "cup" },
  watermelon:      { per: 152, one: "cup" },
  spinach:         { per: 30,  one: "handful" },
  broccoli:        { per: 91,  one: "cup of florets", half: true },
  asparagus:       { per: 134, one: "bunch", half: true },
  cherry_tomato:   { per: 149, one: "cup", half: true },
  mushroom:        { per: 70,  one: "cup sliced", half: true },
  celery:          { per: 40,  one: "stick" },
  edamame:         { per: 155, one: "cup", half: true },
  chicken_breast:  { per: 175, one: "breast", half: true },
  chicken_thigh:   { per: 100, one: "thigh", half: true },
  salmon:          { per: 170, one: "fillet", half: true },
  steak:           { per: 225, one: "steak", half: true },
  beef_mince_5:    { per: 450, one: "pack", half: true },
  pork_tenderloin: { per: 200, one: "portion", half: true },
};

/** "180g chicken breast" -> "1 breast (180g)". Keeps grams as a secondary hint. */
export function kitchenAmount(id, qty) {
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing) return `${qty}`;
  if (ing.unit === "each") {
    const noun = id === "eggs" ? (qty === 1 ? "egg" : "eggs")
      : id === "tortilla" ? (qty === 1 ? "tortilla" : "tortillas")
      : id === "pita" ? (qty === 1 ? "pita" : "pitas")
      : id === "sourdough" ? (qty === 1 ? "slice of sourdough" : "slices of sourdough")
      : id === "qp_burger" || id === "lean_burger" ? (qty === 1 ? "burger" : "burgers")
      : id === "burger_bun" ? (qty === 1 ? "bun" : "buns")
      : id === "naan" ? (qty === 1 ? "naan" : "naans") : "";
    return noun ? `${qty} ${noun}` : `${qty}`;
  }
  if (ing.unit === "scoop") return qty === 1 ? "1 scoop" : `${qty} scoops`;

  const k = kitchenUnits[id];
  if (!k) return `${qty}g`;

  const raw = qty / k.per;
  let count;
  if (k.half) {
    count = Math.round(raw * 2) / 2; // nearest half
    if (count < 0.5) count = 0.5;
  } else {
    count = Math.max(1, Math.round(raw));
  }

  const label = count <= 1 ? k.one : pluralise(k.one); // ½ cup, not ½ cups
  const nice = count === 0.5 ? "½" : Number.isInteger(count) ? String(count) : String(count).replace(".5", "½");
  return `${nice} ${label} (${qty}g)`;
}

function pluralise(word) {
  const map = {
    "cup": "cups", "tbsp": "tbsp", "slice": "slices", "banana": "bananas",
    "apple": "apples", "avocado": "avocados", "cucumber": "cucumbers",
    "courgette": "courgettes", "pepper": "peppers", "sweet potato": "sweet potatoes",
    "potato": "potatoes", "handful": "handfuls", "cup of florets": "cups of florets",
    "bunch": "bunches", "cup sliced": "cups sliced", "stick": "sticks",
    "breast": "breasts", "thigh": "thighs", "fillet": "fillets", "steak": "steaks",
    "pack": "packs", "portion": "portions", "serving": "servings", "chunk": "chunks",
  };
  return map[word] || `${word}s`;
}

/** Macros for a given ingredient quantity — used to show them per line in a recipe. */
export function macrosFor(id, qty) {
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing) return { kcal: 0, protein: 0 };
  const perUnit = ing.unit === "each" || ing.unit === "scoop";
  const f = perUnit ? qty : qty / 100;
  return {
    kcal: Math.round((perUnit ? (ing.kcalPerUnit ?? ing.kcal) : ing.kcal) * f),
    protein: Math.round((perUnit ? (ing.proteinPerUnit ?? ing.protein) : ing.protein) * f),
  };
}

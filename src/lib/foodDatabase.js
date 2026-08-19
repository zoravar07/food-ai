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
  { id: "eggs", name: "Eggs", kcal: 143, protein: 13, carbs: 1, fat: 10, potassium: 126, unit: "each", kcalPerUnit: 78, proteinPerUnit: 6.5, storageDays: { fridge: 21, freezer: 0 }, tags: ["breakfast"] },
  { id: "pork_tenderloin", name: "Pork tenderloin", kcal: 143, protein: 26, carbs: 0, fat: 3.5, storageDays: { fridge: 3, freezer: 180 }, tags: ["lean", "new"] },
  { id: "whey", name: "Whey protein (1 scoop ~30g)", kcal: 120, protein: 24, carbs: 3, fat: 1.5, unit: "scoop", storageDays: { fridge: 0, freezer: 0 }, tags: ["standalone_only"] },
];

export const pantry = [
  { id: "breadcrumbs", name: "Breadcrumbs / panko", kcal: 395, protein: 13, carbs: 72, fat: 5, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "flour", name: "Plain flour", kcal: 364, protein: 10, carbs: 76, fat: 1, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "cheese", name: "Cheddar cheese", kcal: 402, protein: 25, carbs: 1.3, fat: 33, storageDays: { fridge: 21, freezer: 180 } },
  { id: "tortilla", name: "Flour tortilla", kcal: 289, protein: 8, carbs: 48, fat: 7, unit: "each", kcalPerUnit: 145, proteinPerUnit: 4, storageDays: { fridge: 10, freezer: 90 } },
];

export const carbs = [
  { id: "rice", name: "Jasmine/basmati rice", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fibre: 0.4, potassium: 35, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "potato", name: "Potato", kcal: 87, protein: 2, carbs: 20, fat: 0.1, fibre: 2.2, potassium: 425, storageDays: { fridge: 21, freezer: 0 } },
  { id: "sweet_potato", name: "Sweet potato", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fibre: 3, potassium: 337, storageDays: { fridge: 14, freezer: 0 } },
  { id: "pasta", name: "Pasta", kcal: 131, protein: 5, carbs: 25, fat: 1.1, fibre: 1.8, potassium: 44, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 730 },
  { id: "pita", name: "Pita / flatbread", kcal: 275, protein: 9, carbs: 55, fat: 1.2, unit: "each", kcalPerUnit: 165, proteinPerUnit: 5.5, storageDays: { fridge: 5, freezer: 90 } },
  { id: "sourdough", name: "Sourdough", kcal: 289, protein: 9, carbs: 56, fat: 2, fibre: 2.4, potassium: 100, storageDays: { fridge: 5, freezer: 90 } },
  { id: "oats", name: "Oats", kcal: 389, protein: 17, carbs: 66, fat: 7, fibre: 10, potassium: 429, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "rice_noodles", name: "Rice noodles", kcal: 109, protein: 1.8, carbs: 25, fat: 0.2, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
];

export const veg = [
  { id: "broccoli", name: "Broccoli", kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, fibre: 2.6, potassium: 316, storageDays: { fridge: 7, freezer: 240 } },
  { id: "asparagus", name: "Asparagus", kcal: 20, protein: 2.2, carbs: 3.9, fat: 0.1, storageDays: { fridge: 4, freezer: 240 } },
  { id: "spinach", name: "Spinach / leafy greens", kcal: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fibre: 2.2, potassium: 558, storageDays: { fridge: 5, freezer: 240 } },
  { id: "cucumber", name: "Cucumber", kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1, fibre: 0.5, potassium: 147, storageDays: { fridge: 7, freezer: 0 } },
  { id: "zucchini", name: "Zucchini / courgette", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "peppers", name: "Bell peppers", kcal: 31, protein: 1, carbs: 6, fat: 0.3, fibre: 2.1, potassium: 211, storageDays: { fridge: 10, freezer: 240 } },
  { id: "cherry_tomato", name: "Cherry tomatoes", kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fibre: 1.2, potassium: 237, storageDays: { fridge: 7, freezer: 0 } },
  { id: "mushroom", name: "Mushroom", kcal: 22, protein: 3.1, carbs: 3.3, fat: 0.3, storageDays: { fridge: 5, freezer: 240 } },
  { id: "celery", name: "Celery", kcal: 16, protein: 0.7, carbs: 3, fat: 0.2, storageDays: { fridge: 14, freezer: 0 } },
  { id: "edamame", name: "Edamame", kcal: 121, protein: 12, carbs: 8.9, fat: 5, storageDays: { fridge: 0, freezer: 300 } },
  { id: "avocado", name: "Avocado", kcal: 160, protein: 2, carbs: 8.5, fat: 15, fibre: 6.7, potassium: 485, storageDays: { fridge: 5, freezer: 0 } },
];

export const fruit = [
  { id: "berries", name: "Mixed berries", kcal: 50, protein: 0.8, carbs: 12, fat: 0.3, fibre: 5, potassium: 150, storageDays: { fridge: 5, freezer: 240 } },
  { id: "watermelon", name: "Watermelon", kcal: 30, protein: 0.6, carbs: 8, fat: 0.2, storageDays: { fridge: 7, freezer: 0 } },
  { id: "banana", name: "Banana", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fibre: 2.6, potassium: 358, storageDays: { fridge: 5, freezer: 60 } },
  { id: "apple", name: "Apple", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, storageDays: { fridge: 21, freezer: 0 } },
  { id: "mango", name: "Mango", kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, storageDays: { fridge: 5, freezer: 240 } },
];

export const dairy = [
  { id: "milk", name: "Milk (semi-skimmed)", kcal: 50, protein: 3.6, carbs: 4.8, fat: 1.8, potassium: 150, storageDays: { fridge: 7, freezer: 0 } },
  { id: "coconut_water", name: "Coconut water", kcal: 19, protein: 0.7, carbs: 3.7, fat: 0.2, potassium: 250, storageDays: { fridge: 5, freezer: 0 } },
  { id: "greek_yoghurt", name: "Greek yoghurt", kcal: 97, protein: 9, carbs: 3.6, fat: 5, potassium: 141, storageDays: { fridge: 10, freezer: 0 } },
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
  { id: "peanut_butter_g", name: "Peanut butter", kcal: 588, protein: 25, carbs: 20, fat: 50, fibre: 6, potassium: 649, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 180 },
  { id: "olive_oil_g", name: "Olive oil", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 540 },
  { id: "sesame_oil_g", name: "Sesame oil", kcal: 884, protein: 0, carbs: 0, fat: 100, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 365 },
  { id: "tuna_tin", name: "Tuna tin (~145g drained)", kcal: 116, protein: 26, carbs: 0, fat: 1, unit: "each", kcalPerUnit: 116, proteinPerUnit: 26, storageDays: { fridge: 0, freezer: 0 }, pantryLife: 730 },
];

export const allIngredients = [...proteins, ...carbs, ...veg, ...fruit, ...dairy, ...pantry, ...fats];



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
  spinach:      { unit: "bag", perUnit: 250 },
  cherry_tomato:{ unit: "punnet", perUnit: 250 },
  mushroom:     { unit: "punnet", perUnit: 250 },
  celery:       { unit: "bunch", perUnit: 400 },
  sweet_potato: { unit: "sweet potato", perUnit: 250 },
  potato:       { unit: "bag", perUnit: 2000 },

  // Fruit
  banana:     { unit: "banana", perUnit: 120 },
  apple:      { unit: "apple", perUnit: 180 },
  berries:    { unit: "punnet", perUnit: 250 },
  mango:      { unit: "mango", perUnit: 300 },
  watermelon: { unit: "quarter melon", perUnit: 1500 },

  // Store cupboard — buy the jar/bag once, lasts weeks
  peanut_butter_g: { unit: "jar", perUnit: 340, bulk: true },
  olive_oil_g:     { unit: "bottle", perUnit: 500, bulk: true },
  sesame_oil_g:    { unit: "bottle", perUnit: 250, bulk: true },
  rice:            { unit: "bag", perUnit: 1000, bulk: true },
  oats:            { unit: "bag", perUnit: 1000, bulk: true },
  pasta:           { unit: "bag", perUnit: 500, bulk: true },
  rice_noodles:    { unit: "pack", perUnit: 250, bulk: true },
  breadcrumbs:     { unit: "pack", perUnit: 200, bulk: true },
  flour:           { unit: "bag", perUnit: 1000, bulk: true },

  // Chilled
  greek_yoghurt: { unit: "big tub", perUnit: 1000 },
  milk:          { unit: "2L bottle", perUnit: 2000 },
  coconut_water: { unit: "1L carton", perUnit: 1000 },
  cheese:        { unit: "block", perUnit: 250 },
  feta:          { unit: "block", perUnit: 200 },
  tortilla:      { unit: "pack of 8", perUnit: 1, boxOf: 8 },
  pita:          { unit: "pack of 6", perUnit: 1, boxOf: 6 },
  sourdough:     { unit: "loaf", perUnit: 800 },
  edamame:       { unit: "frozen bag", perUnit: 500, bulk: true },
  tuna_tin:      { unit: "tin", perUnit: 145 },
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
export const pricePer100g = {
  chicken_breast: 0.9, chicken_thigh: 0.7, salmon: 2.2, steak: 2.6, beef_mince_5: 1.1,
  turkey_mince: 1.0, pork_tenderloin: 1.3, rice: 0.15, potato: 0.1, sweet_potato: 0.2,
  pasta: 0.12, pita: 0.3, sourdough: 0.35, oats: 0.15, rice_noodles: 0.35,
  broccoli: 0.25, asparagus: 0.7, spinach: 0.4, cucumber: 0.2, zucchini: 0.3,
  peppers: 0.5, cherry_tomato: 0.5, mushroom: 0.4, celery: 0.2, edamame: 0.6,
  avocado: 0.8, berries: 1.2, watermelon: 0.15, banana: 0.2, apple: 0.25, mango: 0.4,
  greek_yoghurt: 0.28, feta: 1.0, milk: 0.09, coconut_water: 0.25, breadcrumbs: 0.35, peanut_butter_g: 0.6, olive_oil_g: 0.7, sesame_oil_g: 1.2, flour: 0.15, cheese: 0.9, tortilla: 0.45,
};
export const priceEach = { eggs: 0.28, tuna_tin: 1.1 };

export function estimateItemCost(id, qty) {
  const ing = allIngredients.find((x) => x.id === id);
  if (!ing || id === "whey") return 0;
  if (ing.unit === "each") return (priceEach[id] || 0) * qty;
  return ((pricePer100g[id] || 0.3) * qty) / 100;
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
  sourdough:       { per: 45,  one: "slice" },
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
      : id === "tuna_tin" ? (qty === 1 ? "tin of tuna" : "tins of tuna") : "";
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

// src/lib/store.js
// All persistence lives here. If Supabase isn't configured yet the app still runs,
// falling back to in-memory state so nothing crashes before setup is complete.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;

// In-memory fallback so the UI works before Supabase is wired up
const memory = { weeks: [], logs: [], shops: [], pantry: [], custom: [], supplements: [], staples: [], haveEnough: [], rules: [], profile: null };

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // weeks run Mon–Sun
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
export const currentWeekStart = mondayOf;

// ---------- Profile (editable settings) ----------
export const DEFAULT_PROFILE = {
  age: 19, height_cm: 185, weight_kg: 72.5, sex: "male",
  training_days: 5, goal: "mild_cut", budget_cap: 65,
  meals_per_day: 4, max_cook_minutes: 30, dislikes: ["corn"], notes: "",
};

export async function getProfile() {
  if (!supabase) return memory.profile || DEFAULT_PROFILE;
  const { data, error } = await supabase.from("profile").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data || DEFAULT_PROFILE;
}

export async function saveProfile(fields) {
  if (!supabase) { memory.profile = { ...(memory.profile || DEFAULT_PROFILE), ...fields }; return memory.profile; }
  const { data, error } = await supabase
    .from("profile").upsert({ id: 1, ...fields, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select().single();
  if (error) throw error;
  return data;
}

export async function addDislike(item) {
  const p = await getProfile();
  const next = Array.from(new Set([...(p.dislikes || []), item.toLowerCase().trim()]));
  return saveProfile({ dislikes: next });
}

export async function removeDislike(item) {
  const p = await getProfile();
  const next = (p.dislikes || []).filter((d) => d !== item.toLowerCase().trim());
  return saveProfile({ dislikes: next });
}

// ---------- Rules & cravings ----------
export async function getRules() {
  if (!supabase) return memory.rules || [];
  const { data, error } = await supabase.from("rules").select("*").eq("active", true).order("created_at");
  if (error) throw error;
  return data || [];
}

export async function addRule(text, kind = "standing") {
  const row = { text, kind, active: true };
  if (!supabase) { memory.rules = [...(memory.rules || []), { ...row, id: crypto.randomUUID() }]; return row; }
  const { data, error } = await supabase.from("rules").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function removeRule(id) {
  if (!supabase) { memory.rules = (memory.rules || []).filter((r) => r.id !== id); return; }
  const { error } = await supabase.from("rules").delete().eq("id", id);
  if (error) throw error;
}

/** Remove a rule by fuzzy text match — lets the AI say "drop the Friday burger thing". */
export async function removeRuleByText(fragment) {
  const rules = await getRules();
  const frag = fragment.toLowerCase();
  const hit = rules.find((r) => r.text.toLowerCase().includes(frag) || frag.includes(r.text.toLowerCase()));
  if (hit) { await removeRule(hit.id); return hit; }
  return null;
}

/** Cravings expire once a plan has been generated with them. */
export async function clearCravings() {
  if (!supabase) { memory.rules = (memory.rules || []).filter((r) => r.kind !== "craving"); return; }
  const { error } = await supabase.from("rules").delete().eq("kind", "craving");
  if (error) throw error;
}

// ---------- Weeks ----------
// A week is identified by its start date, but you can generate several plans for
// the same week. Each new one is stored with a version so the old one survives.
export async function saveWeekVersion(weekStart, plan, targets, budgetCap) {
  if (!supabase) {
    memory.weeks.unshift({ id: crypto.randomUUID(), week_start: weekStart, plan, targets, budget_cap: budgetCap, created_at: new Date().toISOString() });
    return memory.weeks[0];
  }

  const { data, error } = await supabase
    .from("weeks")
    .insert({ week_start: weekStart, plan, targets, budget_cap: budgetCap })
    .select().single();

  if (!error) return data;

  // 23505 = unique violation: the old one-plan-per-week constraint is still in
  // place. Rather than silently overwriting (which is what made history vanish),
  // archive the existing plan under a shifted date so both remain browsable.
  if (error.code === "23505") {
    const existing = await getWeek(weekStart);
    if (existing?.id) {
      const archiveDate = new Date(weekStart);
      archiveDate.setDate(archiveDate.getDate() - Math.ceil(Math.random() * 3000));
      await supabase.from("weeks").update({ week_start: archiveDate.toISOString().slice(0, 10) }).eq("id", existing.id);
    }
    const retry = await supabase
      .from("weeks")
      .insert({ week_start: weekStart, plan, targets, budget_cap: budgetCap })
      .select().single();
    if (retry.error) throw retry.error;
    return retry.data;
  }
  throw error;
}

export async function saveWeek(weekStart, plan, targets, budgetCap) {
  if (!supabase) {
    if (memory.weeks.length) memory.weeks[0] = { ...memory.weeks[0], plan };
    else memory.weeks = [{ week_start: weekStart, plan, targets, budget_cap: budgetCap, created_at: new Date().toISOString() }];
    return memory.weeks[0];
  }
  const existing = await getWeek(weekStart);
  if (existing?.id) {
    const { data, error } = await supabase.from("weeks").update({ plan }).eq("id", existing.id).select().single();
    if (error) throw error;
    return data;
  }
  return saveWeekVersion(weekStart, plan, targets, budgetCap);
}

export async function getWeek(weekStart) {
  if (!supabase) return memory.weeks.find((w) => w.week_start === weekStart) || null;
  // There can be several saved plans for one week — take the most recent.
  const { data, error } = await supabase
    .from("weeks").select("*").eq("week_start", weekStart)
    .order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function listWeeks(limit = 20) {
  if (!supabase) return memory.weeks;
  const { data, error } = await supabase
    .from("weeks").select("id, week_start, plan, targets, created_at")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ---------- Meal logs ----------
export async function logMeal({ date, slot, status, mealName, kcal, protein, carbs, fat, note }) {
  const row = { log_date: date, slot, status, meal_name: mealName, kcal, protein, carbs, fat, note };
  if (!supabase) {
    memory.logs = memory.logs.filter((l) => !(l.log_date === date && l.slot === slot)).concat(row);
    return row;
  }
  const { data, error } = await supabase.from("meal_logs").upsert(row, { onConflict: "log_date,slot" }).select().single();
  if (error) throw error;
  return data;
}

export async function getLogsForRange(startDate, endDate) {
  if (!supabase) return memory.logs.filter((l) => l.log_date >= startDate && l.log_date <= endDate);
  const { data, error } = await supabase
    .from("meal_logs").select("*").gte("log_date", startDate).lte("log_date", endDate);
  if (error) throw error;
  return data || [];
}

// ---------- Grocery shops ----------
export async function saveShop(shopDate, items, estimatedTotal) {
  const row = { shop_date: shopDate, items, estimated_total: estimatedTotal };
  if (!supabase) { memory.shops.unshift(row); return row; }
  const { data, error } = await supabase.from("grocery_shops").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function getShopHistory(limit = 12) {
  if (!supabase) return memory.shops;
  const { data, error } = await supabase
    .from("grocery_shops").select("*").order("shop_date", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ---------- Pantry (leftover stock between weeks) ----------
export async function getPantry() {
  if (!supabase) return memory.pantry;
  const { data, error } = await supabase.from("pantry").select("*");
  if (error) throw error;
  return data || [];
}

export async function setPantryItem(ingredientId, name, quantity, unit = "g", extra = {}) {
  const row = { ingredient_id: ingredientId, name, quantity, unit, ...extra, updated_at: new Date().toISOString() };
  // If the newer columns (category/low/display) aren't in the database yet, the
  // insert fails wholesale. Retry with just the core fields rather than losing
  // the whole shop.
  if (supabase) {
    const first = await supabase.from("pantry").upsert(row, { onConflict: "ingredient_id" }).select().maybeSingle();
    if (!first.error) return first.data;
    const bare = { ingredient_id: ingredientId, name, quantity, unit, updated_at: row.updated_at };
    const retry = await supabase.from("pantry").upsert(bare, { onConflict: "ingredient_id" }).select().maybeSingle();
    if (retry.error) throw retry.error;
    return retry.data;
  }
  memory.pantry = memory.pantry.filter((p) => p.ingredient_id !== ingredientId).concat(row);
  return row;
}

/** Pantry rows -> { ingredientId: quantity } for the grocery generator */
export async function getLeftovers() {
  const rows = await getPantry();
  return rows.reduce((acc, r) => {
    if (Number(r.quantity) > 0 && !r.low) acc[r.ingredient_id] = Number(r.quantity);
    return acc;
  }, {});
}

/** After a shop, record what was bought so next week nets it off */
export async function stockPantryFromShop(items) {
  const existing = await getPantry();
  const rows = items.map((it) => {
    const prev = existing.find((p) => p.ingredient_id === it.id);
    return {
      ingredient_id: it.id,
      name: it.name,
      quantity: (Number(prev?.quantity) || 0) + (it.buyGrams || 0),
      unit: "g",
      category: it.longLife ? "cupboard" : "fresh",
      low: false,
      display: it.display,
      updated_at: new Date().toISOString(),
    };
  });

  if (!supabase) {
    rows.forEach((r) => {
      memory.pantry = memory.pantry.filter((p) => p.ingredient_id !== r.ingredient_id).concat(r);
    });
    return rows;
  }

  const full = await supabase.from("pantry").upsert(rows, { onConflict: "ingredient_id" }).select();
  if (!full.error) return full.data;

  // Older schema without category/low/display — write what it can take.
  const bare = rows.map(({ ingredient_id, name, quantity, unit, updated_at }) => ({ ingredient_id, name, quantity, unit, updated_at }));
  const retry = await supabase.from("pantry").upsert(bare, { onConflict: "ingredient_id" }).select();
  if (retry.error) throw retry.error;
  return retry.data;
}

// "Plenty" needs to actually clear the shopping list, not just nudge quantity
// off zero — 1g still leaves the grocery generator asking for nearly the full
// amount. No single tracked ingredient's realistic weekly need comes close to
// this, so flooring here reliably zeroes out what the list thinks is needed.
const PLENTY_FLOOR = 5000;

export async function markPantry(ingredientId, state) {
  const rows = await getPantry();
  const row = rows.find((p) => p.ingredient_id === ingredientId);
  if (!row) return;
  if (state === "out") await setPantryItem(ingredientId, row.name, 0, row.unit, { low: false, category: row.category });
  if (state === "low") await setPantryItem(ingredientId, row.name, row.quantity, row.unit, { low: true, category: row.category });
  if (state === "plenty") await setPantryItem(ingredientId, row.name, Math.max(row.quantity, PLENTY_FLOOR), row.unit, { low: false, category: row.category });
}

export async function removePantryItem(ingredientId) {
  if (!supabase) { memory.pantry = memory.pantry.filter((p) => p.ingredient_id !== ingredientId); return; }
  const { error } = await supabase.from("pantry").delete().eq("ingredient_id", ingredientId);
  if (error) throw error;
}

/** Deduct what a cooked meal used */
/** Deduct what a cooked meal used. Fresh items only — tracking how much cumin
 *  is left is not worth anyone's time, so cupboard staples are left alone. */
export async function consumeIngredients(items) {
  const pantry = await getPantry();
  for (const [id, qty] of items) {
    const row = pantry.find((p) => p.ingredient_id === id);
    if (!row || row.category === "cupboard") continue;
    const next = Math.max(0, Number(row.quantity) - qty);
    await setPantryItem(id, row.name, next, row.unit, { category: row.category, low: next > 0 && next < qty });
  }
}

// ---------- "I have enough" — items to leave off the shopping list ----------
export async function getHaveEnough() {
  if (!supabase) return memory.haveEnough || [];
  const { data, error } = await supabase.from("have_enough").select("*");
  if (error) throw error;
  return data || [];
}

export async function setHaveEnough(ingredientId, enough) {
  if (!supabase) {
    memory.haveEnough = memory.haveEnough || [];
    memory.haveEnough = enough
      ? [...memory.haveEnough.filter((h) => h.ingredient_id !== ingredientId), { ingredient_id: ingredientId }]
      : memory.haveEnough.filter((h) => h.ingredient_id !== ingredientId);
    return;
  }
  if (enough) {
    const { error } = await supabase.from("have_enough").upsert({ ingredient_id: ingredientId, marked_at: new Date().toISOString() }, { onConflict: "ingredient_id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("have_enough").delete().eq("ingredient_id", ingredientId);
    if (error) throw error;
  }
}

// ---------- Custom shopping-list items ----------
export async function getCustomItems() {
  if (!supabase) return memory.custom;
  const { data, error } = await supabase.from("custom_items").select("*").order("added_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addCustomItem(name, quantity, recurring = false) {
  const row = { name, quantity, recurring };
  if (!supabase) { memory.custom.unshift({ ...row, id: crypto.randomUUID() }); return row; }
  const { data, error } = await supabase.from("custom_items").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCustomItem(id) {
  if (!supabase) { memory.custom = memory.custom.filter((c) => c.id !== id); return; }
  const { error } = await supabase.from("custom_items").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Supplements ----------
export async function getSupplements() {
  if (!supabase) return memory.supplements;
  const { data, error } = await supabase.from("supplements").select("*").eq("active", true);
  if (error) throw error;
  return data || [];
}

export async function updateSupplement(id, fields) {
  if (!supabase) {
    memory.supplements = memory.supplements.map((s) => (s.id === id ? { ...s, ...fields } : s));
    return;
  }
  const { error } = await supabase.from("supplements").update(fields).eq("id", id);
  if (error) throw error;
}

// ---------- Start-of-term staples ----------
export async function getStaples() {
  if (!supabase) return memory.staples;
  const { data, error } = await supabase.from("staples").select("*").order("category");
  if (error) throw error;
  return data || [];
}

export async function toggleStaple(id, bought) {
  if (!supabase) {
    memory.staples = memory.staples.map((s) => (s.id === id ? { ...s, bought } : s));
    return;
  }
  const { error } = await supabase.from("staples").update({ bought }).eq("id", id);
  if (error) throw error;
}

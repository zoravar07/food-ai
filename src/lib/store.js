// src/lib/store.js
// All persistence lives here. If Supabase isn't configured yet the app still runs,
// falling back to in-memory state so nothing crashes before setup is complete.

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;

// In-memory fallback so the UI works before Supabase is wired up
const memory = { weeks: [], logs: [], shops: [], pantry: [], custom: [], supplements: [], staples: [] };

function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // weeks run Mon–Sun
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
export const currentWeekStart = mondayOf;

// ---------- Weeks ----------
export async function saveWeek(weekStart, plan, targets, budgetCap) {
  if (!supabase) {
    memory.weeks = [{ week_start: weekStart, plan, targets, budget_cap: budgetCap }];
    return memory.weeks[0];
  }
  const { data, error } = await supabase
    .from("weeks")
    .upsert({ week_start: weekStart, plan, targets, budget_cap: budgetCap }, { onConflict: "week_start" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWeek(weekStart) {
  if (!supabase) return memory.weeks.find((w) => w.week_start === weekStart) || null;
  const { data, error } = await supabase.from("weeks").select("*").eq("week_start", weekStart).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listWeeks(limit = 12) {
  if (!supabase) return memory.weeks;
  const { data, error } = await supabase
    .from("weeks").select("week_start, plan, targets").order("week_start", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

// ---------- Meal logs ----------
export async function logMeal({ date, slot, status, mealName, kcal, protein, note }) {
  const row = { log_date: date, slot, status, meal_name: mealName, kcal, protein, note };
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

export async function setPantryItem(ingredientId, name, quantity, unit = "g") {
  const row = { ingredient_id: ingredientId, name, quantity, unit, updated_at: new Date().toISOString() };
  if (!supabase) {
    memory.pantry = memory.pantry.filter((p) => p.ingredient_id !== ingredientId).concat(row);
    return row;
  }
  const { data, error } = await supabase.from("pantry").upsert(row, { onConflict: "ingredient_id" }).select().single();
  if (error) throw error;
  return data;
}

/** Pantry rows -> { ingredientId: quantity } for the grocery generator */
export async function getLeftovers() {
  const rows = await getPantry();
  return rows.reduce((acc, r) => {
    if (r.quantity > 0) acc[r.ingredient_id] = Number(r.quantity);
    return acc;
  }, {});
}

/** After a shop, record what was bought so next week nets it off */
export async function stockPantryFromShop(items) {
  for (const it of items) {
    await setPantryItem(it.id, it.name, it.toBuy, it.unit);
  }
}

/** Deduct what a cooked meal used */
export async function consumeIngredients(items) {
  const pantry = await getPantry();
  for (const [id, qty] of items) {
    const row = pantry.find((p) => p.ingredient_id === id);
    if (!row) continue;
    await setPantryItem(id, row.name, Math.max(0, Number(row.quantity) - qty), row.unit);
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

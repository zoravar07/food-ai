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

// Weeks start on the day of the last shop; weeks.js owns that definition and
// App resolves the anchor. Nothing in the store needs to know it.
import { iso } from "./weeks.js";

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

/** Retire specific rules by id. Cravings are spent when they actually land in a
 *  plan; this used to delete every craving whenever anything was generated. */
export async function removeRules(ids = []) {
  if (!ids.length) return;
  if (!supabase) { memory.rules = (memory.rules || []).filter((r) => !ids.includes(r.id)); return; }
  const { error } = await supabase.from("rules").delete().in("id", ids);
  if (error) throw error;
}

// ---------- Weeks ----------
// A week is identified by its start date, but you can generate several plans for
// the same week. Each new one is stored with a version so the old one survives.
export async function saveWeekVersion(weekStart, plan, targets, budgetCap) {
  if (!supabase) {
    memory.weeks = (memory.weeks || []).map((w) => (w.week_start === weekStart ? { ...w, status: "archived" } : w));
    memory.weeks.unshift({ id: crypto.randomUUID(), week_start: weekStart, plan, targets, budget_cap: budgetCap, status: "draft", created_at: new Date().toISOString() });
    return memory.weeks[0];
  }

  // A fresh plan replaces whatever was there for that week, so the old one
  // archives rather than lingering as a second live plan. If that week had
  // already been shopped the food is still in the kitchen, so the replacement
  // inherits that — regenerating a plan doesn't un-buy the groceries.
  let row = { week_start: weekStart, plan, targets, budget_cap: budgetCap };
  if (await statusAvailable()) {
    const prior = await supabase.from("weeks").select("status, shopped_at").eq("week_start", weekStart).eq("status", "active").limit(1);
    const wasShopped = prior.data?.[0];
    await supabase.from("weeks").update({ status: "archived" }).eq("week_start", weekStart);
    row = wasShopped
      ? { ...row, status: "active", shopped_at: wasShopped.shopped_at }
      : { ...row, status: "draft" };
  }
  const { data, error } = await supabase.from("weeks").insert(row).select().single();
  if (!error) return data;

  // 23505 means the original one-plan-per-week constraint is somehow back. The
  // old handling moved the existing row to a RANDOM date up to eight years in
  // the past so the insert could proceed: two archives could collide on the same
  // date, and an archived plan could land on a date the app reads as "last week".
  // Status is how a superseded plan steps aside now, so a collision here means
  // the schema is wrong and should say so rather than scattering dates.
  if (error.code === "23505") {
    throw new Error("weeks.week_start still has a unique constraint — run the v1 block in supabase_schema.sql (alter table weeks drop constraint weeks_week_start_key)");
  }
  throw error;
}

// ---------- Shop state (schema v3) ----------
// Which weeks have actually been shopped for. Until the v3 migration is run the
// column isn't there, so every status-aware call degrades to the old date-only
// behaviour rather than erroring — the app keeps working either way.
let hasStatus = null;
async function statusAvailable() {
  if (hasStatus !== null) return hasStatus;
  if (!supabase) { hasStatus = true; return true; }
  const { error } = await supabase.from("weeks").select("status").limit(1);
  hasStatus = !error;
  if (!hasStatus) console.warn("weeks.status missing — run the v3 block in supabase_schema.sql");
  return hasStatus;
}

/** Weeks that have been shopped for, newest first, with the date it happened —
 *  the Shop tab says "✓ Bought Sunday" rather than just "bought". */
export async function getShoppedWeeks(limit = 20) {
  if (!supabase) {
    return (memory.weeks || []).filter((w) => w.status === "active")
      .map((w) => ({ week_start: w.week_start, shopped_at: w.shopped_at || null }));
  }
  if (!(await statusAvailable())) return [];
  const { data, error } = await supabase
    .from("weeks").select("week_start, shopped_at").eq("status", "active")
    .order("week_start", { ascending: false }).limit(limit);
  if (error) return [];
  return data || [];
}

/** Undo of "Groceries done" — the shop didn't happen after all. Without this the
 *  pantry was restored but the week stayed marked bought, so the Shop tab moved
 *  on to next week and the list you'd just un-bought was unreachable. */
export async function unmarkWeekShopped(shopDate, restoreKey) {
  // The shop is undone in full, including the re-key: the plan goes back to the
  // week it was generated for, so the anchor falls back to the shop before it.
  if (!supabase) {
    memory.weeks = (memory.weeks || []).map((w) => (w.week_start === shopDate && w.status === "active"
      ? { ...w, week_start: restoreKey || w.week_start, status: "draft", shopped_at: null } : w));
    return;
  }
  if (!(await statusAvailable())) return;
  const patch = { status: "draft", shopped_at: null };
  if (restoreKey) patch.week_start = restoreKey;
  await supabase.from("weeks").update(patch).eq("week_start", shopDate).eq("status", "active");
}

/** "Groceries done" — this plan is now the one being eaten from, and the week
 *  starts today because today is when he shopped. Re-keying to the shop date is
 *  what makes the cycle follow him instead of a weekday: the plan stays
 *  reachable at week_start, and week_start is the anchor. */
export async function markWeekShopped(weekStart, shopDate) {
  const when = shopDate || new Date().toISOString().slice(0, 10);
  if (!supabase) {
    memory.weeks = (memory.weeks || []).map((w) =>
      w.week_start === weekStart ? { ...w, week_start: when, status: "active", shopped_at: new Date().toISOString() } : w);
    return;
  }
  if (!(await statusAvailable())) return;
  const current = await getWeek(weekStart);
  if (!current?.id) return;
  // Older plans for the same week step aside so only one is ever the live one.
  await supabase.from("weeks").update({ status: "archived" }).eq("week_start", weekStart).neq("id", current.id);
  await supabase.from("weeks")
    .update({ week_start: when, status: "active", shopped_at: new Date().toISOString() })
    .eq("id", current.id);
}

/** Edit the live plan for a week in place — a swapped meal refines the plan
 *  that's already there rather than becoming a new one, so history holds each
 *  plan he GENERATED, not a near-identical row per meal change. Generation goes
 *  through saveWeekVersion, which archives the old plan and inserts a new one;
 *  the two are not interchangeable and each says so. */
export async function saveWeek(weekStart, plan, targets, budgetCap) {
  if (!supabase) {
    // This edited memory.weeks[0] regardless of weekStart, so an edit aimed at
    // next week rewrote whichever plan happened to be newest.
    const at = memory.weeks.findIndex((w) => w.week_start === weekStart);
    if (at >= 0) { memory.weeks[at] = { ...memory.weeks[at], plan }; return memory.weeks[at]; }
    return saveWeekVersion(weekStart, plan, targets, budgetCap);
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
  if (!supabase) {
    const rows = memory.weeks.filter((w) => w.week_start === weekStart);
    return rows.find((w) => w.status !== "archived") || rows[0] || null;
  }
  // A week can hold several saved plans. Prefer the live one: reading the newest
  // row regardless of status could hand back a superseded plan and let an edit
  // land on it, which is the same class of mistake as editing the wrong week.
  if (await statusAvailable()) {
    const live = await supabase
      .from("weeks").select("*").eq("week_start", weekStart).neq("status", "archived")
      .order("created_at", { ascending: false }).limit(1);
    if (!live.error && live.data?.[0]) return live.data[0];
  }
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

/** Un-log a meal. Clearing only ever happened in React state before, so the row
 *  survived in the database and came straight back on the next reload. */
export async function clearMeal(date, slot) {
  if (!supabase) {
    memory.logs = memory.logs.filter((l) => !(l.log_date === date && l.slot === slot));
    return;
  }
  const { error } = await supabase.from("meal_logs").delete().eq("log_date", date).eq("slot", slot);
  if (error) throw error;
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

/** Pantry rows -> { ingredientId: quantity } for the grocery generator.
 *  A row he marked "running low" counts as nothing, because that tap means
 *  "don't rely on this, buy more". Only his tap sets that flag — see
 *  consumeIngredients for why cooking must not. */
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
    // Deliberately does NOT touch `low`. Cooking produces an accurate remainder,
    // and getLeftovers treats a low row as if it were empty — so auto-flagging
    // here made the 60g of chicken you genuinely have stop counting toward the
    // list, which then asked for a full week's worth as though you had none.
    // `low` stays what it is: something he said, not something we inferred.
    await setPantryItem(id, row.name, next, row.unit, { category: row.category, low: row.low });
  }
}

/** Put back what un-logging a meal means you didn't actually cook. Without this,
 *  ticking a meal, un-ticking it and ticking it again drained the pantry twice
 *  over — logging could only ever subtract. */
export async function restoreIngredients(items) {
  const pantry = await getPantry();
  for (const [id, qty] of items) {
    const row = pantry.find((p) => p.ingredient_id === id);
    if (!row || row.category === "cupboard") continue;
    const next = Number(row.quantity) + qty;
    // Same rule in reverse: putting stock back doesn't overrule what he said.
    await setPantryItem(id, row.name, next, row.unit, { category: row.category, low: row.low });
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

import React, { useState, useEffect, useRef, useCallback } from "react";
import { calculateTargets, analyseDay } from "./lib/macroEngine.js";
import { generateWeek, templates, interpretRules, excludeDisliked } from "./lib/mealPlanner.js";
import { buildGroceryList } from "./lib/groceryListGenerator.js";
import { allIngredients, kitchenAmount, macrosFor } from "./lib/foodDatabase.js";
import { recipes } from "./lib/recipes.js";
import { askAssistant } from "./lib/assistant.js";
import * as store from "./lib/store.js";
import { DAYS, iso, weekStartFor, dateForDay, weekLabel } from "./lib/weeks.js";

const t = {
  bg: "#0D1117", panel: "#151B24", card: "#1B222D", cardHi: "#232C3A",
  line: "#2C3644", text: "#F0F3F7", soft: "#8D96A6", dim: "#5F6879",
  teal: "#4DD4B8", amber: "#F5A962", peri: "#7C9CFF", coral: "#FF7A7A", violet: "#B98CFF",
};
const AISLE = { produce: "Fruit & veg", meat: "Meat & fish", chilled: "Chilled", bakery: "Bakery", cupboard: "Cupboard" };
const TABS = [
  { id: "groceries", label: "Shop", icon: "🛒" },
  { id: "pantry", label: "Pantry", icon: "🥫" },
  { id: "plan", label: "Plan", icon: "📅" },
  { id: "ai", label: "AI", icon: "✦" },
  { id: "settings", label: "You", icon: "⚙" },
];
const todayDayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };

// A log row holds a REAL estimate once it has macros on it — that only happens
// when the AI worked them out from what he actually ate. The planned meal's
// numbers must never quietly replace those, so both meal-card buttons check
// this before writing. See mark() and confirmAteOut().
const hasEstimate = (log) => log?.status === "ate_out" && Number(log?.kcal) > 0;

/* ---------------- shared bits ---------------- */
const Btn = ({ children, onClick, kind = "ghost", size = "md", style = {}, ...p }) => {
  const base = { border: "none", borderRadius: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", whiteSpace: "nowrap" };
  const kinds = {
    primary: { background: t.peri, color: t.bg },
    good: { background: t.teal, color: t.bg },
    ghost: { background: "transparent", color: t.soft, border: `1px solid ${t.line}` },
    solid: { background: t.cardHi, color: t.text, border: `1px solid ${t.line}` },
    danger: { background: "transparent", color: t.coral, border: `1px solid rgba(255,122,122,.4)` },
  };
  const sizes = { sm: { padding: "7px 12px", fontSize: 13 }, md: { padding: "11px 16px", fontSize: 14.5 }, lg: { padding: "15px 20px", fontSize: 16 } };
  return <button onClick={onClick} style={{ ...base, ...kinds[kind], ...sizes[size], ...style }} {...p}>{children}</button>;
};

function MacroBar({ label, value, target, unit, color }) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div style={{ flex: "1 1 140px", minWidth: 120 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: value > target * 1.08 ? t.amber : t.soft }}>
          {Math.round(value)}<span style={{ color: t.dim }}>/{target}{unit}</span>
        </span>
      </div>
      <div style={{ height: 7, background: t.line, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ---------------- recipe page ---------------- */
function RecipePage({ meal, onBack }) {
  const r = recipes[meal.id];
  const mac = analyseDay([meal], allIngredients);
  return (
    <div style={{ position: "fixed", inset: 0, background: t.bg, zIndex: 200, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ position: "sticky", top: 0, background: t.bg, borderBottom: `1px solid ${t.line}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, zIndex: 2 }}>
        <Btn onClick={onBack} kind="solid" size="sm" style={{ borderRadius: 10 }}>← Back</Btn>
        <span style={{ fontSize: 13, color: t.soft, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{meal.slot}</span>
      </div>

      <div style={{ padding: "22px 18px 60px", maxWidth: 780, margin: "0 auto" }}>
        <h1 style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 6px", lineHeight: 1.2 }}>{meal.name}</h1>
        <div style={{ fontSize: 14, color: t.soft, marginBottom: 18 }}>{meal.time} minutes</div>
        {r?.blurb && <p style={{ fontSize: 16, lineHeight: 1.6, margin: "0 0 22px" }}>{r.blurb}</p>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 26 }}>
          {[["kcal", mac.kcal, ""], ["protein", mac.protein, "g"], ["carbs", mac.carbs, "g"], ["fat", mac.fat, "g"]].map(([k, v, u]) => (
            <div key={k} style={{ flex: "1 1 70px", background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 600 }}>{v}{u}</div>
              <div style={{ fontSize: 10.5, color: t.soft, textTransform: "uppercase", letterSpacing: ".05em" }}>{k}</div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 12, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".09em", margin: "0 0 12px" }}>What you need</h2>
        <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "4px 16px", marginBottom: 30 }}>
          {(meal.items || []).map(([id, qty], i) => {
            const ing = allIngredients.find((x) => x.id === id);
            if (!ing) return null;
            const mm = macrosFor(id, qty);
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "13px 0", borderBottom: i < meal.items.length - 1 ? `1px solid ${t.line}` : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{kitchenAmount(id, qty)}</div>
                  <div style={{ fontSize: 13, color: t.soft, marginTop: 1 }}>{ing.name}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>
                  <div style={{ fontSize: 13 }}>{mm.kcal} kcal</div>
                  <div style={{ fontSize: 12, color: t.coral }}>{mm.protein}g</div>
                </div>
              </div>
            );
          })}
        </div>

        {r?.steps && (
          <>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".09em", margin: "0 0 14px" }}>Method</h2>
            <div style={{ marginBottom: 26 }}>
              {r.steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, background: t.cardHi, color: t.peri, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</div>
                  <div style={{ fontSize: 15.5, lineHeight: 1.62, paddingTop: 3 }}>{s}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {r?.tip && (
          <div style={{ background: "rgba(245,169,98,.09)", border: "1px solid rgba(245,169,98,.3)", borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.amber, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Worth knowing</div>
            <div style={{ fontSize: 15, lineHeight: 1.6 }}>{r.tip}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- meal card ---------------- */
function MealCard({ meal, log, onOpen, onMark, onReplace, readOnly }) {
  const done = log?.status === "eaten", out = log?.status === "ate_out";
  return (
    <div style={{ background: t.card, border: `1px solid ${done ? "rgba(77,212,184,.35)" : t.line}`, borderRadius: 16, display: "flex", alignItems: "stretch", opacity: log?.status === "skipped" ? .5 : 1 }}>
      <button onClick={() => !readOnly && onMark(meal, done ? null : "eaten")}
        style={{ background: "none", border: "none", padding: "16px 0 16px 16px", alignSelf: "flex-start" }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${done ? t.teal : t.line}`, background: done ? t.teal : "transparent", color: t.bg, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{done ? "✓" : ""}</div>
      </button>
      <div onClick={() => onOpen(meal)} style={{ flex: 1, padding: "16px 12px", minWidth: 0, cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".07em" }}>{meal.slot}</span>
          {meal.time && <span style={{ fontSize: 11.5, color: t.dim }}>{meal.time} min</span>}
          {out && <span style={{ fontSize: 11.5, color: t.amber, fontWeight: 600 }}>ate out</span>}
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 600, marginBottom: 4, lineHeight: 1.25 }}>{out && log?.meal_name ? log.meal_name : meal.name}</div>
        <div style={{ fontSize: 13, color: t.soft }}>
          {out ? `${Math.round(log?.kcal || 0)} kcal · ${Math.round(log?.protein || 0)}g protein` : `${Math.round(meal.kcal)} kcal · ${Math.round(meal.protein)}g protein`}
          {!out && <span style={{ color: t.peri, marginLeft: 8 }}>recipe →</span>}
          {!readOnly && !out && (
            <button onClick={(e) => { e.stopPropagation(); onReplace(meal); }}
              style={{ background: "none", border: "none", color: t.violet, fontSize: 13, fontWeight: 600, padding: 0, marginLeft: 10 }}>replace</button>
          )}
        </div>
      </div>
      {/* With a real estimate on the row this button EDITS it rather than
          toggling it off — tapping it used to delete the macros and drop the
          card back to the planned meal. */}
      {!readOnly && (
        <button onClick={() => onMark(meal, out && !hasEstimate(log) ? null : "ate_out")}
          style={{ background: out ? "rgba(245,169,98,.15)" : "transparent", border: "none", borderLeft: `1px solid ${t.line}`, color: out ? t.amber : t.dim, padding: "0 14px", fontSize: 11.5, fontWeight: 600, borderRadius: "0 16px 16px 0" }}>
          ate<br />out
        </button>
      )}
    </div>
  );
}

/* ================= APP ================= */
export default function App() {
  const [tab, setTab] = useState("plan");
  const [profile, setProfile] = useState(store.DEFAULT_PROFILE);
  const [targets, setTargets] = useState(() => calculateTargets(store.DEFAULT_PROFILE));
  const [weekOffset, setWeekOffset] = useState(0);
  const [shopOffset, setShopOffset] = useState(0);
  const [dayIdx, setDayIdx] = useState(todayDayIdx());
  const [weeks, setWeeks] = useState({});          // { "2026-08-24": plan }
  const [grocery, setGrocery] = useState(null);
  const [logs, setLogs] = useState({});
  const [pantry, setPantry] = useState([]);
  const [rules, setRules] = useState([]);
  const [haveEnough, setHaveEnough] = useState([]);
  const [checked, setChecked] = useState({});
  const [custom, setCustom] = useState([]);
  const [openMeal, setOpenMeal] = useState(null);
  const [guide, setGuide] = useState({});
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const [ateOut, setAteOut] = useState(null);
  const [ateOutText, setAteOutText] = useState("");
  const [overwrite, setOverwrite] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [pantryCheck, setPantryCheck] = useState(null);
  const chatEnd = useRef(null);
  const undoRef = useRef(null);
  const pendingLog = useRef(null);   // where an AI macro estimate must land

  const wsKey = weekStartFor(weekOffset);
  const plan = weeks[wsKey] || null;
  const day = plan?.[dayIdx] || null;

  // The shop tracks its own week. It used to read whatever week the Plan
  // calendar happened to be showing, so scrolling back to today silently
  // swapped next week's list — the one you just generated — for the week
  // you'd already shopped.
  const shopKey = weekStartFor(shopOffset);
  const shopPlan = weeks[shopKey] || null;

  useEffect(() => { boot(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, busy]);

  // Shop day. Keyed off the real device date — not dayIdx, which follows
  // whatever day you happen to be looking at in the calendar — and remembered
  // per date so it asks once on the Sunday, not every time the app opens.
  useEffect(() => {
    const now = new Date();
    if (now.getDay() !== 0) return;
    const today = iso(now);
    try { if (localStorage.getItem("hv_pantry_check") === today) return; } catch { return; }
    setPantryCheck(today);
  }, []);

  function dismissPantryCheck(goToPantry) {
    try { localStorage.setItem("hv_pantry_check", pantryCheck); } catch {}
    setPantryCheck(null);
    if (goToPantry) setTab("pantry");
  }

  /** Hand the chat an editable starting line rather than firing a swap blind. */
  function replaceMeal(meal) {
    setInput(`Replace ${meal.name} on ${DAYS[dayIdx]} with: `);
    setTab("ai");
  }

  async function boot() {
    try {
      const p = await store.getProfile();
      setProfile(p); setTargets(calculateTargets(p));
      const cur = await store.getWeek(weekStartFor(0));
      if (cur?.plan) setWeeks((w) => ({ ...w, [weekStartFor(0)]: cur.plan }));
      else await makePlan(0, p);
      const prev = await store.getWeek(weekStartFor(-1));
      if (prev?.plan) setWeeks((w) => ({ ...w, [weekStartFor(-1)]: prev.plan }));
      await Promise.all([loadPantry(), loadRules(), loadLogs(), loadExtras()]);
    } catch (e) { console.error(e); await makePlan(0, store.DEFAULT_PROFILE); }
  }

  const loadPantry = async () => { try { setPantry(await store.getPantry()); } catch {} };
  const loadRules = async () => { try { setRules(await store.getRules()); } catch {} };
  const loadExtras = async () => {
    try { setCustom(await store.getCustomItems()); } catch {}
    try { setHaveEnough((await store.getHaveEnough()).map((h) => h.ingredient_id)); } catch {}
  };
  async function loadLogs() {
    try {
      const rows = await store.getLogsForRange(iso(dateForDay(-1, 0)), iso(dateForDay(1, 6)));
      const m = {}; rows.forEach((r) => { m[`${r.log_date}|${r.slot}`] = r; });
      setLogs(m);
    } catch {}
  }

  const flash = useCallback((msg, undo) => {
    undoRef.current = undo || null;
    setToast({ msg, undo: Boolean(undo) });
    // A toast is easy to miss with a phone in one hand and a trolley in the
    // other, so anything undoable also parks itself on Shop and Pantry until
    // the next undoable action replaces it.
    if (undo) setLastAction({ msg, fn: undo });
    setTimeout(() => setToast((cur) => (cur?.msg === msg ? null : cur)), undo ? 9000 : 2600);
  }, []);

  const runUndo = useCallback(async () => {
    const fn = undoRef.current;
    undoRef.current = null; setToast(null); setLastAction(null);
    if (fn) await fn();
  }, []);

  async function refreshGrocery(p, he = haveEnough) {
    if (!p) return setGrocery(null);
    let left = {};
    try { left = await store.getLeftovers(); } catch {}
    setGrocery(buildGroceryList(p, left, he));
  }

  useEffect(() => { refreshGrocery(shopPlan); /* eslint-disable-next-line */ }, [shopPlan, haveEnough, pantry]);
  useEffect(() => { loadWeekIfNeeded(shopOffset); /* eslint-disable-next-line */ }, [shopOffset]);

  async function makePlan(offset = weekOffset, prof = profile) {
    setBusy(true); setConfirmNew(false);
    const tg = calculateTargets(prof);
    const opts = { ...interpretRules(rules), blocked: excludeDisliked(prof.dislikes || []) };
    const p = generateWeek(tg, prof.budget_cap || 65, 60, opts);
    const key = weekStartFor(offset);
    setWeeks((w) => ({ ...w, [key]: p }));
    setShopOffset(offset);   // the shop follows the plan you just generated
    try {
      await store.saveWeekVersion(key, p, tg, prof.budget_cap || 65);
      if (rules.some((r) => r.kind === "craving")) { await store.clearCravings(); await loadRules(); }
    } catch (e) { console.error(e); flash("Generated but not saved"); }
    setBusy(false);
    flash(offset === weekOffset ? "New plan ready" : `${weekLabel(offset)} planned`);
  }

  async function applyPlan(next) {
    const fixed = next.map((d) => ({ ...d, totals: d.meals.reduce((a, m) => ({ kcal: Math.round(a.kcal + m.kcal), protein: Math.round(a.protein + m.protein) }), { kcal: 0, protein: 0 }) }));
    setWeeks((w) => ({ ...w, [wsKey]: fixed }));
    try { await store.saveWeek(wsKey, fixed, targets, profile.budget_cap || 65); } catch {}
  }

  /* ------- logging ------- */
  /** Logging a meal as eaten is the only thing that spends pantry stock, so
   *  every change of state has to settle up in BOTH directions. Consumption
   *  used to be one-way: un-ticking left the stock spent, so tick/untick/tick
   *  charged the pantry twice for one meal. */
  async function settlePantry(meal, wasEaten, isEaten) {
    if (!meal?.items || wasEaten === isEaten) return;
    const items = meal.items.filter(([id]) => id !== "whey");
    if (isEaten) await store.consumeIngredients(items);
    else await store.restoreIngredients(items);
    await loadPantry();
  }

  /** Put a log row back exactly as it was — in the database as well as on
   *  screen, and in the pantry too. `applied` is the status the action being
   *  undone had just written. */
  async function restoreLog(meal, date, prev, applied) {
    const slot = meal.slot;
    setLogs((p) => { const n = { ...p }; if (prev) n[`${date}|${slot}`] = prev; else delete n[`${date}|${slot}`]; return n; });
    try {
      if (prev) await store.logMeal({ date, slot, status: prev.status, mealName: prev.meal_name, kcal: prev.kcal, protein: prev.protein, carbs: prev.carbs, fat: prev.fat, note: prev.note });
      else await store.clearMeal(date, slot);
      await settlePantry(meal, applied === "eaten", prev?.status === "eaten");
    } catch {}
  }

  async function mark(meal, status) {
    const date = iso(dateForDay(weekOffset, dayIdx));
    const prev = logs[`${date}|${meal.slot}`];

    if (status === "ate_out") {
      // Editing an existing estimate, not starting a fresh one — prefill it.
      setAteOutText(hasEstimate(prev) ? (prev.note || prev.meal_name || "") : "");
      setAteOut({ meal, date, existing: prev });
      return;
    }
    // Ticking "eaten" on top of a real estimate would swap what he actually ate
    // for the planned meal's macros. Ask first — this is the exact silent
    // overwrite that made the burger revert to the planned wrap.
    if (status === "eaten" && hasEstimate(prev)) { setOverwrite({ meal, date, existing: prev }); return; }

    const mac = analyseDay([meal], allIngredients);
    setLogs((p) => {
      const n = { ...p };
      if (status) n[`${date}|${meal.slot}`] = { log_date: date, slot: meal.slot, status, meal_name: meal.name, ...mac };
      else delete n[`${date}|${meal.slot}`];
      return n;
    });
    try {
      if (status) {
        await store.logMeal({ date, slot: meal.slot, status, mealName: meal.name, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat });
      } else {
        await store.clearMeal(date, meal.slot);
      }
      await settlePantry(meal, prev?.status === "eaten", status === "eaten");
    } catch {}
    // Clearing a log used to happen with no toast and no undo at all.
    flash(status ? "Logged" : "Log cleared", () => restoreLog(meal, date, prev, status));
  }

  /** Go ahead and log the planned meal over an estimate, after confirming. */
  async function confirmOverwrite() {
    const { meal, date, existing } = overwrite; setOverwrite(null);
    const mac = analyseDay([meal], allIngredients);
    setLogs((p) => ({ ...p, [`${date}|${meal.slot}`]: { log_date: date, slot: meal.slot, status: "eaten", meal_name: meal.name, ...mac } }));
    try {
      await store.logMeal({ date, slot: meal.slot, status: "eaten", mealName: meal.name, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat });
      await settlePantry(meal, existing?.status === "eaten", true);
    } catch {}
    flash("Logged", () => restoreLog(meal, date, existing, "eaten"));
  }

  async function clearAteOut() {
    const { meal, date, existing } = ateOut; setAteOut(null);
    setLogs((p) => { const n = { ...p }; delete n[`${date}|${meal.slot}`]; return n; });
    try {
      await store.clearMeal(date, meal.slot);
      await settlePantry(meal, existing?.status === "eaten", false);
    } catch {}
    flash("Log cleared", () => restoreLog(meal, date, existing, null));
  }

  async function confirmAteOut(desc) {
    const { meal, date, existing } = ateOut; setAteOut(null);
    const text = desc?.trim();
    const keep = hasEstimate(existing);
    // Hold on to the macros already on the row while the AI works out new ones.
    // Writing zeroes first made the day's totals drop to nothing and jump back,
    // and lost the estimate entirely if the request failed.
    const mac = keep
      ? { kcal: existing.kcal, protein: existing.protein, carbs: existing.carbs, fat: existing.fat }
      : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const name = text || (keep ? existing.meal_name : "ate out");
    const note = text || existing?.note;

    setLogs((p) => ({ ...p, [`${date}|${meal.slot}`]: { log_date: date, slot: meal.slot, status: "ate_out", meal_name: name, note, ...mac } }));
    try { await store.logMeal({ date, slot: meal.slot, status: "ate_out", mealName: name, note, ...mac }); } catch {}

    if (text) {
      // Pin where the estimate must land. Without this the model's own choice of
      // day decides, and a mismatch writes the macros to a second row while the
      // placeholder sits on the day he actually tapped.
      pendingLog.current = { date, slot: meal.slot };
      setTab("ai");
      await sendMessage(`I ate out for ${meal.slot.toLowerCase()} instead of ${meal.name}. I had: ${text}. Estimate the macros and log it.`);
      pendingLog.current = null;
    } else flash("Logged as eaten out");
  }

  /* ------- pantry ------- */
  async function pantryAction(id, state) {
    const before = pantry.find((x) => x.ingredient_id === id);
    try { await store.markPantry(id, state); await loadPantry(); } catch {}
    const label = state === "out" ? "Marked as run out" : state === "low" ? "Marked running low" : "Marked as plenty";
    flash(label, before ? async () => {
      await store.setPantryItem(id, before.name, before.quantity, before.unit, { category: before.category, low: before.low });
      loadPantry();
    } : null);
  }

  async function toggleEnough(id, on) {
    const next = on ? [...haveEnough, id] : haveEnough.filter((x) => x !== id);
    setHaveEnough(next);
    try { await store.setHaveEnough(id, on); } catch {}
    flash(on ? "Taken off the list" : "Back on the list", () => {
      setHaveEnough(on ? haveEnough.filter((x) => x !== id) : [...haveEnough, id]);
      store.setHaveEnough(id, !on).catch(() => {});
    });
  }

  async function groceriesDone() {
    const picked = grocery.items.filter((i) => checked[i.id]);
    if (!picked.length) return flash("Nothing ticked yet");
    try {
      await store.stockPantryFromShop(picked);
      try { await store.saveShop(iso(new Date()), picked, picked.reduce((a, i) => a + i.estCost, 0)); } catch {}
      await loadPantry();
    } catch (e) {
      // Don't fail silently — an invisible error here looks like "nothing happened".
      console.error("pantry write failed:", e);
      return flash(`Couldn't save to pantry: ${e.message || "check Supabase setup"}`);
    }
    setChecked({});
    setTab("pantry");
    flash(`${picked.length} items added to your pantry`, async () => {
      for (const it of picked) await store.removePantryItem(it.id);
      loadPantry();
    });
  }

  /* ------- chat ------- */
  async function sendMessage(text) {
    const next = [...chat, { role: "user", content: text }];
    setChat(next); setBusy(true);
    try {
      const { reply, actions } = await askAssistant(next, { week: plan, pantry, targets, rules });
      setChat([...next, { role: "assistant", content: reply }]);
      for (const a of actions || []) await runAction(a);
    } catch (e) { setChat([...next, { role: "assistant", content: `Couldn't reach the assistant — ${e.message}` }]); }
    setBusy(false);
  }
  const send = async () => { const v = input.trim(); if (!v || busy) return; setInput(""); await sendMessage(v); };

  async function runAction(a) {
    if (!a?.type) return;
    if (a.type === "regenerate_week") return makePlan();

    if ((a.type === "swap_meal" || a.type === "set_meal") && plan) {
      const di = DAYS.indexOf(a.day); if (di < 0) return;
      const slotKey = (a.slot || "").toLowerCase();
      // Swaps used to source their replacement from a plain generateWeek() with
      // no options, so an AI-driven swap could quietly plant a disliked
      // ingredient or overwrite a standing rule. Same constraints as makePlan.
      const base = { ...interpretRules(rules), blocked: excludeDisliked(profile.dislikes || []) };
      // Asking for this slot to change outranks a standing rule sitting on it,
      // for this occurrence only — otherwise the generator hands back the pinned
      // meal and the swap silently does nothing. Every other pin still holds.
      const opts = { ...base, pins: (base.pins || []).filter((p) => !(p.day === a.day && p.slot === a.slot)) };
      const blockedHere = base.blocked?.[slotKey] || [];
      let rep = null;

      if (a.type === "set_meal" && a.templateId) {
        // The model can name a template directly, so the block list has to be
        // checked here too rather than relied on inside the generator.
        if (blockedHere.includes(a.templateId)) {
          flash(`${a.templateId.replace(/_/g, " ")} uses something you won't eat`);
          return;
        }
        const fresh = generateWeek(targets, profile.budget_cap || 65, 30, opts);
        rep = fresh.flatMap((d) => d.meals).find((m) => m.id === a.templateId);
      } else {
        const fresh = generateWeek(targets, profile.budget_cap || 65, 30, opts);
        const cur = plan[di].meals.find((m) => m.slot === a.slot);
        const pick = (m) => m.slot === a.slot && !blockedHere.includes(m.id);
        rep = fresh[di].meals.find((m) => pick(m) && m.id !== cur?.id) || fresh[di].meals.find(pick);
      }
      // A replacement that slipped through anyway is dropped rather than planned.
      if (rep && blockedHere.includes(rep.id)) rep = null;
      if (!rep) { flash("Couldn't find a swap that fits your rules"); return; }
      const before = plan;
      await applyPlan(plan.map((d, i) => i !== di ? d : { ...d, meals: d.meals.map((m) => m.slot === a.slot ? rep : m) }));
      flash(`${a.day} ${a.slot} updated`, () => setWeeks((w) => ({ ...w, [wsKey]: before })));
      return;
    }
    if (a.type === "add_grocery") { try { await store.addCustomItem(a.name, a.quantity || ""); setCustom(await store.getCustomItems()); flash(`Added ${a.name}`); } catch {} return; }
    if (a.type === "have_enough" && a.ingredient) return toggleEnough(a.ingredient, true);
    if (a.type === "need_again" && a.ingredient) return toggleEnough(a.ingredient, false);
    if (a.type === "pantry" && a.ingredient) return pantryAction(a.ingredient, a.state);
    if (a.type === "add_rule") { try { await store.addRule(a.text, "standing"); await loadRules(); flash("Rule saved"); } catch {} return; }
    if (a.type === "add_craving") { try { await store.addRule(a.text, "craving"); await loadRules(); flash("Craving noted"); } catch {} return; }
    if (a.type === "remove_rule") { try { const r = await store.removeRuleByText(a.match || a.text || ""); await loadRules(); flash(r ? "Rule removed" : "No matching rule"); } catch {} return; }
    if (a.type === "add_dislike" && a.item) {
      try { const p = await store.addDislike(a.item); setProfile(p); flash(`Won't plan ${a.item} again`); } catch {}
      return;
    }
    if (a.type === "remove_dislike" && a.item) {
      try { const p = await store.removeDislike(a.item); setProfile(p); flash(`${a.item} allowed again`); } catch {}
      return;
    }
    if (a.type === "set_profile" && a.field) {
      const next = { ...profile, [a.field]: a.value };
      setProfile(next); setTargets(calculateTargets(next));
      try { await store.saveProfile({ [a.field]: a.value }); } catch {}
      flash(`${a.field.replace(/_/g, " ")} updated`);
      return;
    }
    if (a.type === "log_estimate") {
      // If this estimate was requested by the "ate out" sheet, it belongs on the
      // row he tapped — not on whatever day the model named.
      const di = a.day ? DAYS.indexOf(a.day) : dayIdx;
      const date = pendingLog.current?.date || iso(dateForDay(weekOffset, di >= 0 ? di : dayIdx));
      const slot = pendingLog.current?.slot || a.slot || "Lunch";
      const row = { log_date: date, slot, status: "ate_out", meal_name: a.description || "ate out", kcal: +a.kcal || 0, protein: +a.protein || 0, carbs: +a.carbs || 0, fat: +a.fat || 0 };
      setLogs((p) => ({ ...p, [`${date}|${row.slot}`]: row }));
      try { await store.logMeal({ date, slot: row.slot, status: "ate_out", mealName: row.meal_name, kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, note: a.description }); } catch {}
      flash(`Logged ${row.kcal} kcal`);
    }
  }

  /* ------- derived ------- */
  const dayLog = (slot) => logs[`${iso(dateForDay(weekOffset, dayIdx))}|${slot}`];
  const consumed = (() => {
    const acc = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, potassium: 0 };
    if (!day) return acc;
    const date = iso(dateForDay(weekOffset, dayIdx));
    day.meals.forEach((m) => {
      const log = logs[`${date}|${m.slot}`];
      if (!log || log.status === "skipped") return;
      if (log.status === "ate_out") { acc.kcal += +log.kcal || 0; acc.protein += +log.protein || 0; acc.carbs += +log.carbs || 0; acc.fat += +log.fat || 0; return; }
      const mm = analyseDay([m], allIngredients);
      Object.keys(acc).forEach((k) => { acc[k] += mm[k] || 0; });
    });
    return acc;
  })();
  const planned = day ? analyseDay(day.meals, allIngredients) : null;

  const pantrySections = [
    { key: "low", label: "Running low", items: pantry.filter((p) => p.low || Number(p.quantity) <= 0) },
    { key: "fresh", label: "Fresh this week", items: pantry.filter((p) => !p.low && Number(p.quantity) > 0 && p.category !== "cupboard") },
    { key: "cupboard", label: "Cupboard", items: pantry.filter((p) => !p.low && Number(p.quantity) > 0 && p.category === "cupboard") },
  ];

  const allTicked = grocery?.items.length > 0 && grocery.items.every((i) => checked[i.id]);

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "Inter,system-ui,-apple-system,sans-serif", paddingBottom: 78 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;overscroll-behavior-y:none}
        button{font-family:inherit}input,select,textarea{font-family:inherit;outline:none;font-size:16px}
        ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:${t.line};border-radius:3px}
        .row{display:flex}.col{display:flex;flex-direction:column}
        .stack>*+*{margin-top:10px}
        @media(min-width:900px){.wrap{max-width:860px;margin:0 auto}}`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 12, left: 12, right: 12, zIndex: 300, display: "flex", justifyContent: "center" }}>
          <div style={{ background: t.cardHi, border: `1px solid ${t.line}`, color: t.text, padding: "11px 16px", borderRadius: 14, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 8px 24px rgba(0,0,0,.4)" }}>
            {toast.msg}
            {toast.undo && <button onClick={runUndo}
              style={{ background: "none", border: "none", color: t.peri, fontWeight: 700, fontSize: 14 }}>Undo</button>}
          </div>
        </div>
      )}

      {openMeal && <RecipePage meal={openMeal} onBack={() => setOpenMeal(null)} />}

      {confirmNew && (
        <Modal onClose={() => setConfirmNew(false)} title="Generate a new plan?"
          body={`This replaces the meals for ${weekLabel(weekOffset).toLowerCase()} and rebuilds the shopping list. The old plan stays in your history.`}>
          <Btn kind="primary" size="lg" style={{ flex: 1 }} onClick={() => makePlan()}>Generate</Btn>
          <Btn size="lg" onClick={() => setConfirmNew(false)}>Cancel</Btn>
        </Modal>
      )}

      {pantryCheck && (
        <Modal onClose={() => dismissPantryCheck(false)} title="Shop day — quick pantry check?"
          body="Run through what actually survived the week before you shop. Anything you've run out of, or still have plenty of, changes the list.">
          <Btn kind="primary" size="lg" style={{ flex: 1 }} onClick={() => dismissPantryCheck(true)}>Check pantry</Btn>
          <Btn size="lg" onClick={() => dismissPantryCheck(false)}>Not now</Btn>
        </Modal>
      )}

      {overwrite && (
        <Modal onClose={() => setOverwrite(null)} title="Replace what you logged?"
          body={`You logged ${overwrite.existing.meal_name} here — ${Math.round(overwrite.existing.kcal)} kcal, ${Math.round(overwrite.existing.protein)}g protein. Ticking this off swaps that for the planned ${overwrite.meal.name}.`}>
          <Btn kind="primary" size="lg" style={{ flex: 1 }} onClick={confirmOverwrite}>Replace it</Btn>
          <Btn size="lg" onClick={() => setOverwrite(null)}>Keep mine</Btn>
        </Modal>
      )}

      {ateOut && (
        <Modal onClose={() => setAteOut(null)}
          title={hasEstimate(ateOut.existing) ? "Change what you ate?" : "What did you eat?"}
          body={hasEstimate(ateOut.existing)
            ? `Currently logged as ${Math.round(ateOut.existing.kcal)} kcal, ${Math.round(ateOut.existing.protein)}g protein. Edit the description to re-estimate it.`
            : "Rough description is fine — I'll estimate the macros and add them to today's total."}>
          <div style={{ width: "100%" }}>
            <input autoFocus value={ateOutText} onChange={(e) => setAteOutText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAteOut(ateOutText)}
              placeholder="e.g. chicken shawarma wrap and chips"
              style={{ width: "100%", padding: "14px 15px", borderRadius: 12, background: t.card, border: `1px solid ${t.line}`, color: t.text, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="good" size="lg" style={{ flex: 1 }} onClick={() => confirmAteOut(ateOutText)}>
                {hasEstimate(ateOut.existing) ? "Re-estimate" : "Log it"}
              </Btn>
              {hasEstimate(ateOut.existing)
                ? <Btn kind="danger" size="lg" onClick={clearAteOut}>Clear log</Btn>
                : <Btn size="lg" onClick={() => confirmAteOut("")}>Skip</Btn>}
            </div>
          </div>
        </Modal>
      )}

      <div className="wrap" style={{ padding: "0 16px" }}>
        <header style={{ padding: "22px 0 14px" }}>
          <h1 style={{ fontSize: 25, fontWeight: 700, letterSpacing: "-.03em", margin: 0 }}>hungryvar</h1>
          <div style={{ fontSize: 12.5, color: t.soft, marginTop: 2 }}>
            {targets.targetKcal} kcal · {targets.protein}g protein · £{profile.budget_cap || 65}/wk
          </div>
        </header>

        {/* Ticking the wrong thing off in a shop is easy and the toast is gone
            by the time you notice, so the last undoable action stays reachable
            on both tabs where that happens. */}
        {lastAction && (tab === "groceries" || tab === "pantry") && (
          <button onClick={runUndo}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, color: t.text, fontFamily: "inherit" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>↩ Undo last action</span>
            <span style={{ fontSize: 12.5, color: t.soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastAction.msg}</span>
          </button>
        )}

        {/* ---------- PLAN ---------- */}
        {tab === "plan" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: 6 }}>
              <Btn size="sm" kind="ghost" style={{ border: "none" }} onClick={() => { setWeekOffset((o) => o - 1); loadWeekIfNeeded(weekOffset - 1); }}>←</Btn>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{weekLabel(weekOffset)}</div>
                <div style={{ fontSize: 11.5, color: t.dim }}>
                  {dateForDay(weekOffset, 0).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {dateForDay(weekOffset, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
              <Btn size="sm" kind="ghost" style={{ border: "none", opacity: weekOffset >= 1 ? .3 : 1 }}
                onClick={() => { if (weekOffset < 1) { setWeekOffset((o) => o + 1); loadWeekIfNeeded(weekOffset + 1); } else flash("Can't plan more than a week ahead"); }}>→</Btn>
            </div>

            {!plan ? (
              <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 16, padding: "36px 22px", textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Not generated yet</div>
                <div style={{ fontSize: 14, color: t.soft, marginBottom: 20, lineHeight: 1.5 }}>There's no plan for {weekLabel(weekOffset).toLowerCase()}.</div>
                <Btn kind="primary" size="lg" onClick={() => makePlan(weekOffset)} disabled={busy}>{busy ? "Generating…" : "Generate now"}</Btn>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 18 }}>
                  {DAYS.map((d, i) => {
                    const on = i === dayIdx, isToday = weekOffset === 0 && i === todayDayIdx();
                    return (
                      <button key={d} onClick={() => setDayIdx(i)}
                        style={{ flex: "1 0 60px", background: on ? t.cardHi : "transparent", border: `1px solid ${on ? t.peri : t.line}`, borderRadius: 13, padding: "10px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? t.peri : t.soft, textTransform: "uppercase" }}>{d}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 600, color: t.text }}>{dateForDay(weekOffset, i).getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 16, padding: "18px 18px 20px", marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>Eaten so far</span>
                    <span style={{ fontSize: 11.5, color: t.dim }}>full plan = {planned.kcal} kcal · {planned.protein}g</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                    <MacroBar label="Calories" value={consumed.kcal} target={targets.targetKcal} unit="" color={t.amber} />
                    <MacroBar label="Protein" value={consumed.protein} target={targets.protein} unit="g" color={t.coral} />
                    <MacroBar label="Carbs" value={consumed.carbs} target={targets.carbs} unit="g" color={t.peri} />
                    <MacroBar label="Fat" value={consumed.fat} target={targets.fat} unit="g" color={t.violet} />
                    <MacroBar label="Fibre" value={consumed.fibre} target={targets.fiber} unit="g" color={t.teal} />
                    <MacroBar label="Potassium" value={consumed.potassium} target={targets.potassium} unit="mg" color={t.teal} />
                  </div>
                </div>

                <div className="stack" style={{ marginBottom: 18 }}>
                  {day.meals.map((m, i) => (
                    <MealCard key={i} meal={m} log={dayLog(m.slot)} onOpen={setOpenMeal} onMark={mark} onReplace={replaceMeal} readOnly={weekOffset !== 0} />
                  ))}
                </div>

                <Btn kind="ghost" size="md" style={{ width: "100%" }} onClick={() => setConfirmNew(true)} disabled={busy}>
                  {busy ? "Generating…" : "Generate a new plan"}
                </Btn>
              </>
            )}
          </>
        )}

        {/* ---------- GROCERIES ---------- */}
        {tab === "groceries" && !shopPlan && (
          <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 16, padding: "36px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>No plan to shop for</div>
            <div style={{ fontSize: 14, color: t.soft, marginBottom: 20, lineHeight: 1.5 }}>
              The list is built from {weekLabel(shopOffset).toLowerCase()}'s meals, and there's no plan for it yet.
            </div>
            <Btn kind="primary" size="lg" onClick={() => makePlan(shopOffset)} disabled={busy}>{busy ? "Generating…" : "Generate now"}</Btn>
          </div>
        )}

        {tab === "groceries" && shopPlan && grocery && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>Shopping list</h2>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 19, fontWeight: 600, color: grocery.estimatedTotal <= (profile.budget_cap || 65) ? t.teal : t.coral }}>£{grocery.estimatedTotal.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: 13.5, color: t.soft, margin: "0 0 12px" }}>
              For {weekLabel(shopOffset).toLowerCase()} · {grocery.items.length} items · {Object.values(checked).filter(Boolean).length} in basket
            </p>

            {/* Which week you're shopping for is now an explicit choice here,
                not a side effect of where the Plan calendar is parked. */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: 4 }}>
              {[0, 1].map((o) => (
                <button key={o} onClick={() => { setShopOffset(o); setChecked({}); }}
                  style={{ flex: 1, background: shopOffset === o ? t.cardHi : "transparent", border: "none", color: shopOffset === o ? t.text : t.soft, fontWeight: 600, fontSize: 13.5, padding: "9px 10px", borderRadius: 9 }}>
                  {weekLabel(o)}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <Btn kind="solid" size="md" style={{ flex: 1 }}
                onClick={() => setChecked(allTicked ? {} : Object.fromEntries(grocery.items.map((i) => [i.id, true])))}>
                {allTicked ? "Clear all" : "Select all"}
              </Btn>
              <Btn kind="good" size="md" style={{ flex: 1.4 }} onClick={groceriesDone}>Groceries done →</Btn>
            </div>

            {grocery.byAisle.map((sec) => (
              <div key={sec.aisle} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 9 }}>{AISLE[sec.aisle]}</div>
                <div className="stack">
                  {sec.items.map((it) => (
                    <div key={it.id} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, overflow: "hidden", opacity: checked[it.id] ? .5 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
                        <button onClick={() => setChecked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                          style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${checked[it.id] ? t.teal : t.line}`, background: checked[it.id] ? t.teal : "transparent", color: t.bg, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                          {checked[it.id] ? "✓" : ""}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setGuide((g) => ({ ...g, [it.id]: !g[it.id] }))}>
                          <div style={{ fontSize: 15.5, fontWeight: 600, textDecoration: checked[it.id] ? "line-through" : "none" }}>
                            <span style={{ color: t.peri, fontFamily: "'JetBrains Mono',monospace", marginRight: 7 }}>{it.display}</span>{it.name}
                          </div>
                          <div style={{ fontSize: 12, color: t.dim, marginTop: 2 }}>
                            £{it.estCost.toFixed(2)}{it.note ? ` · ${it.note}` : it.longLife ? " · lasts weeks" : ""}{it.guide ? " · tap for how to pick" : ""}
                          </div>
                        </div>
                      </div>
                      {guide[it.id] && it.guide && (
                        <div style={{ padding: "12px 14px 14px 52px", borderTop: `1px solid ${t.line}` }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.teal, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Go for</div>
                          <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>{it.guide.pick}</div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.coral, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Avoid</div>
                          <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>{it.guide.avoid}</div>
                          <Btn size="sm" onClick={() => toggleEnough(it.id, true)}>Actually, I have enough</Btn>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {haveEnough.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 9 }}>Skipping — you said you have enough</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {haveEnough.map((id) => {
                    const ing = allIngredients.find((x) => x.id === id);
                    return <Btn key={id} size="sm" onClick={() => toggleEnough(id, false)} style={{ borderRadius: 100 }}>{ing?.name || id} <span style={{ color: t.peri }}>+ add back</span></Btn>;
                  })}
                </div>
              </div>
            )}

            <AddItem onAdd={async (n, q) => { try { await store.addCustomItem(n, q); setCustom(await store.getCustomItems()); flash("Added"); } catch {} }} />
            {custom.length > 0 && (
              <div className="stack" style={{ marginTop: 14 }}>
                {custom.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 14px" }}>
                    <span style={{ flex: 1, fontSize: 15 }}>{c.name}</span>
                    <span style={{ fontSize: 13, color: t.soft }}>{c.quantity}</span>
                    <button onClick={async () => { await store.deleteCustomItem(c.id); setCustom(await store.getCustomItems()); }} style={{ background: "none", border: "none", color: t.dim, fontSize: 20 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- PANTRY ---------- */}
        {tab === "pantry" && (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 4px" }}>Your kitchen</h2>
            <p style={{ fontSize: 13.5, color: t.soft, margin: "0 0 18px" }}>
              {pantry.length ? "The shopping list checks this first, so you don't buy things twice." : "Empty for now — tick things off in Shop and hit \u201cGroceries done\u201d to fill it."}
            </p>
            {pantrySections.map((sec) => sec.items.length > 0 && (
              <div key={sec.key} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: sec.key === "low" ? t.coral : t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 9 }}>{sec.label}</div>
                <div className="stack">
                  {sec.items.map((it) => (
                    <div key={it.ingredient_id} style={{ background: t.card, border: `1px solid ${sec.key === "low" ? "rgba(255,122,122,.3)" : t.line}`, borderRadius: 14, padding: "13px 14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 15.5, fontWeight: 600 }}>{it.name}</span>
                        <span style={{ fontSize: 13.5, color: t.soft, fontFamily: "'JetBrains Mono',monospace" }}>
                          {sec.key === "cupboard" ? "in stock" : Number(it.quantity) > 0 ? kitchenAmount(it.ingredient_id, Math.round(Number(it.quantity))) : "none left"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        <Btn size="sm" onClick={() => pantryAction(it.ingredient_id, "out")}>Ran out</Btn>
                        <Btn size="sm" onClick={() => pantryAction(it.ingredient_id, "low")}>Running low</Btn>
                        <Btn size="sm" onClick={() => pantryAction(it.ingredient_id, "plenty")}>Got plenty</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ---------- AI ---------- */}
        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 190px)" }}>
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 4px" }}>hungryvar ai</h2>
            <p style={{ fontSize: 13.5, color: t.soft, margin: "0 0 16px" }}>It can change your plan, list, pantry and settings — just ask.</p>

            {chat.length === 0 && (
              <div className="stack" style={{ marginBottom: 16 }}>
                {["swap tomorrow's dinner", "I always want a burger on Fridays", "I'm out of rice", "no avocado in the shop, what else?", "I fancy Thai food this week"].map((s) => (
                  <button key={s} onClick={() => setInput(s)} style={{ width: "100%", textAlign: "left", background: t.card, border: `1px solid ${t.line}`, borderRadius: 13, padding: "13px 15px", fontSize: 14, color: t.soft }}>{s}</button>
                ))}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div className="stack">
                {chat.map((m, i) => (
                  <div key={i} style={{ background: m.role === "user" ? t.cardHi : t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 15px", marginLeft: m.role === "user" ? 28 : 0, marginRight: m.role === "user" ? 0 : 28 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{m.role === "user" ? "you" : "hungryvar"}</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                ))}
                {busy && <div style={{ fontSize: 13.5, color: t.dim, padding: "6px 2px" }}>thinking…</div>}
                <div ref={chatEnd} />
              </div>
            </div>

            <div style={{ position: "sticky", bottom: 84, background: t.bg, paddingTop: 12, display: "flex", gap: 8 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="ask anything…"
                style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 13, padding: "14px 15px", color: t.text }} />
              <Btn kind="primary" size="lg" onClick={send} disabled={busy} style={{ padding: "0 18px" }}>→</Btn>
            </div>
          </div>
        )}

        {/* ---------- SETTINGS ---------- */}
        {tab === "settings" && (
          <>
            <h2 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 18px" }}>You</h2>

            <Section title="Your targets" note={`${targets.targetKcal} kcal · ${targets.protein}g protein · ${targets.carbs}g carbs · ${targets.fat}g fat`}>
              <Field label="Weight (kg)" type="number" value={profile.weight_kg} onSave={(v) => saveField("weight_kg", +v)} />
              <Field label="Training days per week" type="number" value={profile.training_days} onSave={(v) => saveField("training_days", +v)} />
              <Field label="Goal" type="select" value={profile.goal} options={[["maintain", "Maintain"], ["recomp", "Recomp (slow)"], ["mild_cut", "Lean down (gentle)"], ["cut", "Cut (aggressive)"]]} onSave={(v) => saveField("goal", v)} />
              <Field label="Weekly budget (£)" type="number" value={profile.budget_cap} onSave={(v) => saveField("budget_cap", +v)} />
              <Field label="Max cook time (min)" type="number" value={profile.max_cook_minutes} onSave={(v) => saveField("max_cook_minutes", +v)} />
            </Section>

            <Section title="What you're going for" note="Describe it however you like — the AI reads this when planning.">
              <TextBox value={profile.goal_notes || ""} placeholder="e.g. lean and athletic, V-taper, want to lose the last bit of belly and face fat while keeping my lifts going"
                onSave={(v) => saveField("goal_notes", v)} />
            </Section>

            <Section title="Won't eat" note="Never planned. Add anything you don't want to see.">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: (profile.dislikes || []).length ? 10 : 0 }}>
                {(profile.dislikes || []).map((d) => (
                  <span key={d} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 100, padding: "8px 8px 8px 14px", fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {d}
                    <button onClick={async () => { const p = await store.removeDislike(d); setProfile(p); flash(`${d} allowed again`); }}
                      style={{ background: "none", border: "none", color: t.dim, fontSize: 17, padding: "0 4px", lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
              <QuickAdd placeholder="add something you won't eat…" onAdd={async (v) => { const p = await store.addDislike(v); setProfile(p); flash(`Won't plan ${v}`); }} />
            </Section>

            <Section title="Other rules" note="Anything you've told the AI. Remove here or just ask it to.">
              {rules.length === 0 && <Empty>Nothing yet. Try telling the AI "I always want a burger on Fridays" or "I fancy Thai this week".</Empty>}
              {rules.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 14px" }}>
                  <span style={{ flex: 1, fontSize: 15 }}>{r.text}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: r.kind === "craving" ? t.amber : t.teal, textTransform: "uppercase", letterSpacing: ".05em" }}>
                    {r.kind === "craving" ? "this week" : "always"}
                  </span>
                  <button onClick={async () => { await store.removeRule(r.id); await loadRules(); flash("Removed"); }}
                    style={{ background: "none", border: "none", color: t.dim, fontSize: 20 }}>×</button>
                </div>
              ))}
            </Section>

            <Section title="Anything else" note="Allergies, kitchen quirks, what you're bored of — anything the AI should know.">
              <TextBox value={profile.notes || ""} placeholder="e.g. sharing a freezer so not much space, bored of chicken breast, flatmate has a nut allergy"
                onSave={(v) => saveField("notes", v)} />
            </Section>
          </>
        )}
      </div>

      {/* bottom tab bar */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.panel, borderTop: `1px solid ${t.line}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 150 }}>
        {TABS.map((x) => (
          <button key={x.id} onClick={() => setTab(x.id)}
            style={{ flex: 1, background: "none", border: "none", padding: "11px 0 13px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === x.id ? t.peri : t.dim }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{x.icon}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600 }}>{x.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  async function loadWeekIfNeeded(offset) {
    const key = weekStartFor(offset);
    if (weeks[key]) return;
    try { const w = await store.getWeek(key); if (w?.plan) setWeeks((x) => ({ ...x, [key]: w.plan })); } catch {}
  }

  async function saveField(field, value) {
    const next = { ...profile, [field]: value };
    setProfile(next); setTargets(calculateTargets(next));
    try { await store.saveProfile({ [field]: value }); flash("Saved"); } catch { flash("Couldn't save"); }
  }
}

/* ---------------- small components ---------------- */
function Modal({ title, body, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 440, marginBottom: 8 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 700 }}>{title}</h3>
        {body && <p style={{ fontSize: 14.5, color: t.soft, margin: "0 0 20px", lineHeight: 1.55 }}>{body}</p>}
        <div style={{ display: "flex", gap: 8 }}>{children}</div>
      </div>
    </div>
  );
}

const Section = ({ title, note, children }) => (
  <div style={{ marginBottom: 26 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>{title}</div>
    {note && <div style={{ fontSize: 12.5, color: t.dim, marginBottom: 10 }}>{note}</div>}
    <div className="stack">{children}</div>
  </div>
);

const Empty = ({ children }) => <div style={{ fontSize: 14, color: t.dim, lineHeight: 1.5, padding: "4px 0" }}>{children}</div>;

const RuleRow = ({ text, onRemove }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 14px" }}>
    <span style={{ flex: 1, fontSize: 15 }}>{text}</span>
    <button onClick={onRemove} style={{ background: "none", border: "none", color: t.dim, fontSize: 20 }}>×</button>
  </div>
);

function Field({ label, value, type = "text", options, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const commit = () => { if (String(v) !== String(value)) onSave(v); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "12px 14px" }}>
      <label style={{ flex: 1, fontSize: 14.5 }}>{label}</label>
      {type === "select" ? (
        <select value={v} onChange={(e) => { setV(e.target.value); onSave(e.target.value); }}
          style={{ background: t.cardHi, color: t.text, border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 11px", fontSize: 14 }}>
          {options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
        </select>
      ) : (
        <input type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          style={{ width: 88, background: t.cardHi, color: t.text, border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 11px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }} />
      )}
    </div>
  );
}

function TextBox({ value, placeholder, onSave }) {
  const [v, setV] = useState(value || "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setV(value || ""); setDirty(false); }, [value]);
  return (
    <div>
      <textarea value={v} onChange={(e) => { setV(e.target.value); setDirty(true); }} placeholder={placeholder} rows={3}
        style={{ width: "100%", background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 14px", color: t.text, resize: "vertical", lineHeight: 1.5 }} />
      {dirty && <Btn kind="primary" size="sm" style={{ marginTop: 8 }} onClick={() => { onSave(v); setDirty(false); }}>Save</Btn>}
    </div>
  );
}

function QuickAdd({ placeholder, onAdd }) {
  const [v, setV] = useState("");
  const go = () => { if (v.trim()) { onAdd(v.trim()); setV(""); } };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder={placeholder}
        style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 13, padding: "13px 15px", color: t.text }} />
      <Btn kind="solid" size="md" onClick={go}>Add</Btn>
    </div>
  );
}

function AddItem({ onAdd }) {
  const [n, setN] = useState(""); const [q, setQ] = useState("");
  const go = () => { if (n.trim()) { onAdd(n.trim(), q.trim()); setN(""); setQ(""); } };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="add your own item…"
        style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 13, padding: "13px 15px", color: t.text }} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="qty"
        style={{ width: 76, background: t.card, border: `1px solid ${t.line}`, borderRadius: 13, padding: "13px 12px", color: t.text }} />
      <Btn kind="solid" size="md" onClick={go}>Add</Btn>
    </div>
  );
}

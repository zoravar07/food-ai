import React, { useState, useEffect, useRef, useCallback } from "react";
import { calculateTargets, analyseDay } from "./lib/macroEngine.js";
import { generateWeek, templates, interpretRules, excludeDisliked, trimToBudget, weekCost, rebalanceAfterSwap, setMealOnDay, appliedRules } from "./lib/mealPlanner.js";
import { buildGroceryList } from "./lib/groceryListGenerator.js";
import { allIngredients, kitchenAmount, macrosFor } from "./lib/foodDatabase.js";
import { recipes } from "./lib/recipes.js";
import { askAssistant } from "./lib/assistant.js";
import * as store from "./lib/store.js";
import { DAYS, iso, weekStartFor, dateForDay, weekLabel, todayIndex } from "./lib/weeks.js";
import { shopView } from "./lib/shopView.js";

const t = {
  bg: "#0D1117", panel: "#151B24", card: "#1B222D", cardHi: "#232C3A",
  line: "#2C3644", text: "#F0F3F7", soft: "#8D96A6", dim: "#5F6879",
  teal: "#4DD4B8", amber: "#F5A962", peri: "#7C9CFF", coral: "#FF7A7A", violet: "#B98CFF",
};
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const AISLE = { produce: "Fruit & veg", meat: "Meat & fish", chilled: "Chilled", bakery: "Bakery", cupboard: "Cupboard" };
const TABS = [
  { id: "groceries", label: "Shop", icon: "🛒" },
  { id: "pantry", label: "Pantry", icon: "🥫" },
  { id: "plan", label: "Plan", icon: "📅" },
  { id: "ai", label: "AI", icon: "✦" },
  { id: "settings", label: "You", icon: "⚙" },
];

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
function MealCard({ meal, log, onOpen, onMark, onReplace, readOnly, missing = [] }) {
  const done = log?.status === "eaten", out = log?.status === "ate_out";
  const kcal = Math.round(out ? (log?.kcal || 0) : meal.kcal);
  const protein = Math.round(out ? (log?.protein || 0) : meal.protein);
  return (
    <div style={{ background: t.card, border: `1px solid ${done ? "rgba(77,212,184,.35)" : missing.length ? "rgba(255,122,122,.35)" : t.line}`, borderRadius: 16, display: "flex", alignItems: "flex-start", gap: 2, opacity: log?.status === "skipped" ? .5 : 1, padding: "14px 14px 12px" }}>
      <button onClick={() => !readOnly && onMark(meal, done ? null : "eaten")}
        style={{ background: "none", border: "none", padding: "2px 10px 0 0", flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${done ? t.teal : t.line}`, background: done ? t.teal : "transparent", color: t.bg, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{done ? "✓" : ""}</div>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Slot and time only. Four things on one line can't be made to fit a
            360px phone deterministically, and "usually fits" means it wraps
            badly some of the time. */}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 3 }}>
          {meal.slot}{meal.time ? ` · ${meal.time} min` : ""}
        </div>

        <div onClick={() => onOpen(meal)} style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.25, cursor: "pointer" }}>
          {out && log?.meal_name ? log.meal_name : meal.name}
        </div>

        {/* Macros get their own line so they never wrap, and keep the weighting
            that makes them read as the numbers that matter. */}
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ fontSize: 12.5, color: t.text, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>
            {kcal} kcal · {protein}g protein
          </span>
          {out && <span style={{ fontSize: 11.5, color: t.amber, fontWeight: 600 }}>ate out</span>}
          {missing.length > 0 && !out && (
            <span style={{ fontSize: 11.5, color: t.coral, fontWeight: 600 }}>out of {missing.join(" & ").toLowerCase()}</span>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: "flex", gap: 6, marginTop: 11 }}>
            {!out && <Btn size="sm" kind="solid" style={{ flex: 1, padding: "8px 6px" }} onClick={() => onOpen(meal)}>Recipe</Btn>}
            {!out && <Btn size="sm" kind="solid" style={{ flex: 1, padding: "8px 6px", color: t.violet }} onClick={() => onReplace(meal)}>Replace</Btn>}
            {/* Was a fixed-width vertical strip down the side of every card,
                stealing ~44px from the content and squeezing itself. */}
            <Btn size="sm" kind="solid" style={{ flex: 1, padding: "8px 6px", color: out ? t.amber : t.soft, background: out ? "rgba(245,169,98,.15)" : t.cardHi }}
              onClick={() => onMark(meal, out && !hasEstimate(log) ? null : "ate_out")}>
              {out ? "Edit" : "Ate out"}
            </Btn>
          </div>
        )}
      </div>
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
  const [dayIdx, setDayIdx] = useState(todayIndex());
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
  const [undoStack, setUndoStack] = useState([]);   // most recent undoable action first
  const undoRef = useRef([]);                      // same list, readable synchronously
  const [undoIdx, setUndoIdx] = useState(0);       // which change the arrows are parked on
  const [pantryCheck, setPantryCheck] = useState(null);
  const [shopped, setShopped] = useState([]);      // week_starts already shopped for
  const [booted, setBooted] = useState(false);
  const [shopCheckOff, setShopCheckOff] = useState(false);
  const [confirmShop, setConfirmShop] = useState(null);
  const chatEnd = useRef(null);
  const pendingLog = useRef(null);   // where an AI macro estimate must land
  const autoPlanned = useRef(new Set());  // weeks already auto-generated this session
  const shopping = useRef(false);        // guards a double-tap stocking twice
  const lastSettings = useRef(null);

  const wsKey = weekStartFor(weekOffset);
  const plan = weeks[wsKey] || null;
  const day = plan?.[dayIdx] || null;

  // The shop tracks its own week. It used to read whatever week the Plan
  // calendar happened to be showing, so scrolling back to today silently
  // swapped next week's list — the one you just generated — for the week
  // you'd already shopped.
  const shopKey = weekStartFor(shopOffset);
  const shopPlan = weeks[shopKey] || null;
  const shopRow = (offset) => shopped.find((r) => r.week_start === weekStartFor(offset)) || null;
  const isShopped = (offset) => Boolean(shopRow(offset));

  // Everything the Shop tab shows and allows comes out of one pure function, so
  // the cursor and the clock can't quietly get mixed up in a JSX ternary.
  // weekStartFor(0) is the ONLY place the real week enters this decision.
  const view = shopView({
    weekStart: shopKey,
    realWeekStart: weekStartFor(0),
    label: weekLabel(shopOffset),
    hasPlan: Boolean(shopPlan),
    bought: isShopped(shopOffset),
    boughtOn: shopRow(shopOffset)?.shopped_at?.slice(0, 10) || null,
    itemCount: grocery?.items.length || 0,
  });
  // Ingredients the pantry says are gone. Something never bought has no pantry
  // row at all — that's unknown, not out, so it is deliberately not flagged.
  const outOfStock = new Set(
    pantry.filter((p) => p.category !== "cupboard" && Number(p.quantity) <= 0).map((p) => p.ingredient_id)
  );
  /** Ingredients a meal needs that the kitchen has run out of. Only meaningful
   *  for days still to come in a week already shopped for — that plan assumed
   *  the food was there, and now it isn't. */
  const missingFor = (meal, offset, dIdx) => {
    if (offset !== 0 || dIdx < todayIndex() || !isShopped(0)) return [];
    return (meal.items || [])
      .filter(([id]) => id !== "whey" && outOfStock.has(id))
      .map(([id]) => allIngredients.find((x) => x.id === id)?.name || id);
  };
  // The draft is the first week that hasn't been bought for. Settings changes
  // regenerate this one and never a week whose food is already in the kitchen.
  const draftOffset = isShopped(0) ? 1 : 0;

  // No shop has ever happened, so there is no anchor, no active week, and an
  // empty kitchen by definition. Nothing can have run out and there is nothing
  // to reconcile — the app should say where it is rather than nag about a week
  // he isn't living in yet.
  const preFirstShop = booted && shopped.length === 0;
  const firstShopIn = (() => {
    if (!profile.first_shop_date) return null;
    const [y, m, d] = String(profile.first_shop_date).split("-").map(Number);
    const then = new Date(y, m - 1, d); then.setHours(0, 0, 0, 0);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((then - now) / 86400000);
  })();

  useEffect(() => { boot(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, busy]);

  // Shop day. Keyed off the real device date — not dayIdx, which follows
  // whatever day you happen to be looking at in the calendar — and remembered
  // per date so it asks once on the Sunday, not every time the app opens.
  useEffect(() => {
    // Nothing to check against an empty kitchen.
    if (preFirstShop || !booted) return;
    const now = new Date();
    if (now.getDay() !== 0) return;
    const today = iso(now);
    try { if (localStorage.getItem("hv_pantry_check") === today) return; } catch { return; }
    setPantryCheck(today);
  }, [booted, preFirstShop]);

  // He shops on Sunday. If it's Tuesday and this week still reads as unbought,
  // either he hasn't been yet or he went and forgot to tap "Groceries done" —
  // and in that second case the pantry is stale, so every list netted against it
  // is wrong and nothing currently notices.
  const staleShop = booted && !preFirstShop && !shopCheckOff && todayIndex() >= 2
    && Boolean(weeks[weekStartFor(0)]) && !isShopped(0);

  useEffect(() => {
    try { setShopCheckOff(localStorage.getItem("hv_shop_check") === weekStartFor(0)); } catch {}
  }, [booted]);

  function dismissShopCheck() {
    try { localStorage.setItem("hv_shop_check", weekStartFor(0)); } catch {}
    setShopCheckOff(true);
  }

  function dismissPantryCheck(goToPantry) {
    try { localStorage.setItem("hv_pantry_check", pantryCheck); } catch {}
    setPantryCheck(null);
    if (goToPantry) setTab("pantry");
  }

  /** "Logged" and "log cleared" said nothing about what changed. Every entry in
   *  Changes names the day, the slot and the outcome so it reads as a sentence. */
  const dayName = (offset, dIdx) => dateForDay(offset, dIdx).toLocaleDateString("en-GB", { weekday: "long" });
  const slotOf = (meal) => meal.slot.toLowerCase();

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
      const done = await store.getShoppedWeeks().catch(() => []);
      setShopped(done);
      // Open on the shop you still owe. Once this week is bought, that's next week.
      setShopOffset(done.some((r) => r.week_start === weekStartFor(0)) ? 1 : 0);
      await Promise.all([loadPantry(), loadRules(), loadLogs(), loadExtras()]);
    } catch (e) { console.error(e); await makePlan(0, store.DEFAULT_PROFILE); }
    setBooted(true);
  }

  const loadPantry = async () => { try { setPantry(await store.getPantry()); } catch {} };
  const loadShopped = async () => { try { setShopped(await store.getShoppedWeeks()); } catch {} };
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
    setToast({ msg, undo: Boolean(undo) });
    // A toast is easy to miss with a phone in one hand and a trolley in the
    // other, so undoable actions stack up and stay reachable on Shop and Pantry.
    // A stack rather than one slot: doing two things in a row used to make the
    // first unreachable, and plan swaps need to be undoable too.
    if (undo) {
      undoRef.current = [{ msg, fn: undo }, ...undoRef.current].slice(0, 5);
      setUndoStack(undoRef.current);
      setUndoIdx(0);   // a new change always lands as the newest

    }
    setTimeout(() => setToast((cur) => (cur?.msg === msg ? null : cur)), undo ? 9000 : 2600);
  }, []);

  /** Rewind to the selected change: undo everything from the newest back to and
   *  including it, newest first. Deliberately not a cherry-pick — each undo
   *  entry restores a snapshot, so applying an old one while newer changes stand
   *  would write stale data over them, which is the exact clobbering this app
   *  has been cleared of. Stepping back picks how far to rewind, not what to skip. */
  const rewind = useCallback(async (upto) => {
    setToast(null);
    const entries = undoRef.current.slice(0, upto + 1);
    undoRef.current = undoRef.current.slice(upto + 1);
    setUndoStack(undoRef.current);
    setUndoIdx(0);
    for (const e of entries) { try { await e.fn(); } catch {} }
  }, []);
  const runUndo = useCallback(() => rewind(0), [rewind]);

  async function refreshGrocery(p, he = haveEnough) {
    if (!p) return setGrocery(null);
    let left = {};
    try { left = await store.getLeftovers(); } catch {}
    setGrocery(buildGroceryList(p, left, he));
  }

  useEffect(() => { refreshGrocery(shopPlan); /* eslint-disable-next-line */ }, [shopPlan, haveEnough, pantry]);
  // Sunday fallback: if the week being shopped for has no plan — the app wasn't
  // opened all week, say — load it, and build one on the spot if there is none,
  // rather than leaving the Shop tab empty.
  async function ensureShopPlan(offset) {
    const key = weekStartFor(offset);
    if (weeks[key]) return;
    const stored = await store.getWeek(key).catch(() => null);
    if (stored?.plan) { setWeeks((w) => ({ ...w, [key]: stored.plan })); return; }
    // Only the draft builds itself. Generating for any week he merely browsed to
    // would cost half a second a tap and would invent history for past weeks —
    // everywhere else offers a Generate button instead.
    if (offset !== draftOffset || autoPlanned.current.has(key)) return;
    autoPlanned.current.add(key);
    await makePlan(offset);
  }
  useEffect(() => { if (booted) ensureShopPlan(shopOffset); /* eslint-disable-next-line */ }, [booted, shopOffset, draftOffset]);

  // Standing rules, dislikes and the budget only affect food not yet bought, so
  // a change rebuilds the draft alone. Debounced, because tapping through
  // settings would otherwise fire a full regeneration on every keystroke.
  // Cravings are left out of the signature: generation consumes them, so
  // including them would make each regeneration trigger the next.
  const settingsSig = JSON.stringify([
    rules.filter((r) => r.kind === "standing").map((r) => r.text).sort(),
    [...(profile.dislikes || [])].sort(),
    profile.budget_cap,
  ]);
  useEffect(() => {
    if (!booted) return;
    if (lastSettings.current === null) { lastSettings.current = settingsSig; return; }
    if (lastSettings.current === settingsSig) return;
    lastSettings.current = settingsSig;
    const t = setTimeout(() => {
      const key = weekStartFor(draftOffset);
      if (!weeks[key] || shopped.some((r) => r.week_start === key) || busy) return;
      makePlan(draftOffset, profile, { quiet: true });
    }, 3000);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [settingsSig, booted]);

  async function makePlan(offset = weekOffset, prof = profile, { quiet = false, rules: rulesArg } = {}) {
    setBusy(true); setConfirmNew(false);
    const tg = calculateTargets(prof);
    // Callers can pass rules explicitly: React state lags a just-saved rule by a
    // render, and generating without it would silently drop what he just asked for.
    const rs = rulesArg || rules;
    const opts = { ...interpretRules(rs), blocked: excludeDisliked(prof.dislikes || []) };
    const p = generateWeek(tg, prof.budget_cap || 65, 60, opts);
    const key = weekStartFor(offset);
    setWeeks((w) => ({ ...w, [key]: p }));
    setShopOffset(offset);   // the shop follows the plan you just generated
    try {
      await store.saveWeekVersion(key, p, tg, prof.budget_cap || 65);
      // Only cravings that actually made it into this plan are spent. One that
      // didn't land keeps its turn, and generating a week a craving wasn't for
      // no longer throws it away.
      const spent = appliedRules(p, opts.matched).filter((m) => m.kind === "craving" && m.id);
      if (spent.length) { await store.removeRules(spent.map((m) => m.id)); await loadRules(); }
    } catch (e) { console.error(e); flash("Generated but not saved"); }
    setBusy(false);
    if (quiet) flash(`${weekLabel(offset)} rebuilt around your new rules`);
    else flash(offset === weekOffset ? "New plan ready" : `${weekLabel(offset)} planned`);
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
    flash(status
      ? `Logged ${dayName(weekOffset, dayIdx)} ${slotOf(meal)}: ${meal.name}, ${Math.round(mac.kcal)} kcal`
      : `Cleared ${dayName(weekOffset, dayIdx)} ${slotOf(meal)} log`,
      () => restoreLog(meal, date, prev, status));
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
    flash(`Replaced ${dayName(weekOffset, dayIdx)} ${slotOf(meal)} with the planned meal`,
      () => restoreLog(meal, date, existing, "eaten"));
  }

  async function clearAteOut() {
    const { meal, date, existing } = ateOut; setAteOut(null);
    setLogs((p) => { const n = { ...p }; delete n[`${date}|${meal.slot}`]; return n; });
    try {
      await store.clearMeal(date, meal.slot);
      await settlePantry(meal, existing?.status === "eaten", false);
    } catch {}
    flash(`Cleared ${dayName(weekOffset, dayIdx)} ${slotOf(meal)} log`,
      () => restoreLog(meal, date, existing, null));
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
    } else flash(`Logged ${dayName(weekOffset, dayIdx)} ${slotOf(meal)} as eaten out`);
  }

  /* ------- pantry ------- */
  async function pantryAction(id, state) {
    const before = pantry.find((x) => x.ingredient_id === id);
    try { await store.markPantry(id, state); await loadPantry(); } catch {}
    // Name the item: the Changes control shows this text, and "Marked as run out"
    // on its own tells you nothing about what you'd be undoing.
    const what = before?.name || "item";
    const label = state === "out" ? `${what} marked run out` : state === "low" ? `${what} running low` : `${what} marked plenty`;
    flash(label, before ? async () => {
      await store.setPantryItem(id, before.name, before.quantity, before.unit, { category: before.category, low: before.low });
      loadPantry();
    } : null);
  }

  async function toggleEnough(id, on) {
    const next = on ? [...haveEnough, id] : haveEnough.filter((x) => x !== id);
    setHaveEnough(next);
    try { await store.setHaveEnough(id, on); } catch {}
    const itemName = allIngredients.find((x) => x.id === id)?.name || id;
    flash(on ? `Took ${itemName.toLowerCase()} off the list` : `Put ${itemName.toLowerCase()} back on the list`, () => {
      // Functional update — closing over `haveEnough` meant undoing after two
      // toggles restored a stale list and silently dropped the other change.
      setHaveEnough((prev) => (on ? prev.filter((x) => x !== id) : [...prev, id]));
      store.setHaveEnough(id, !on).catch(() => {});
    });
  }

  async function groceriesDone() {
    // A double-tap on a phone stocked the pantry twice and wrote two shop rows.
    if (shopping.current) return;
    const picked = grocery.items.filter((i) => checked[i.id]);
    if (!picked.length) return flash("Nothing ticked yet");
    shopping.current = true;
    setConfirmShop(null);
    try { await doGroceriesDone(picked); } finally { shopping.current = false; }
  }

  async function doGroceriesDone(picked) {
    // Snapshot before stocking so undo can restore quantities, not wipe rows.
    const priorStock = pantry.map((p) => ({ ...p }));
    try {
      await store.stockPantryFromShop(picked);
      try { await store.saveShop(iso(new Date()), picked, picked.reduce((a, i) => a + i.estCost, 0)); } catch {}
      await loadPantry();
    } catch (e) {
      // Don't fail silently — an invisible error here looks like "nothing happened".
      console.error("pantry write failed:", e);
      return flash(`Couldn't save to pantry: ${e.message || "check Supabase setup"}`);
    }
    // The shop actually happened, so this week's plan stops being a draft and
    // becomes the one being eaten from. Nothing else can tell us that.
    try { await store.markWeekShopped(shopKey); await loadShopped(); } catch {}
    setChecked({});
    setTab("pantry");
    // Roll straight on to the next shop. Pointing shopOffset at it is enough —
    // ensureShopPlan builds the plan if there isn't one, and it's the only path
    // that does, so the two can't both generate for the same week.
    setShopOffset(Math.min(1, shopOffset + 1));
    flash(`Shopped ${picked.length} item${picked.length === 1 ? "" : "s"} into the pantry`, async () => {
      // The shop is undone in full: the week stops counting as bought, and the
      // Shop tab goes back to it rather than stranding you on next week.
      try { await store.unmarkWeekShopped(shopKey); await loadShopped(); } catch {}
      setShopOffset(shopOffset);
      // Undo used to delete the pantry rows outright, so 300g of chicken you
      // already had before the shop vanished with it. Put back what was there.
      for (const it of picked) {
        const was = priorStock.find((p) => p.ingredient_id === it.id);
        if (was) await store.setPantryItem(was.ingredient_id, was.name, was.quantity, was.unit, { category: was.category, low: was.low });
        else await store.removePantryItem(it.id);
      }
      loadPantry();
    });
  }

  /* ------- chat ------- */
  async function sendMessage(text) {
    const next = [...chat, { role: "user", content: text }];
    setChat(next); setBusy(true);
    try {
      // The model was shown THIS week's plan while its edits landed on whichever
      // week the calendar was parked on, so asking to change next week while
      // looking at this one silently rewrote this one. Context and target are
      // now the same week, and the model is told which week that is.
      const viewingNow = weekOffset === 0;
      const { reply, actions } = await askAssistant(next, {
        week: plan, weekLabel: weekLabel(weekOffset),
        planFrom: viewingNow ? todayIndex() : 0,
        swappableDays: viewingNow ? DAYS.slice(todayIndex()) : DAYS,
        pantry, targets, rules, shoppedThisWeek: isShopped(0),
      });
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
      const list = templates[slotKey] || [];
      if (!list.length) return;

      // Candidates come from the template list, not from a freshly generated week.
      // A generated week reuses the same few cheap meals, so it often offered a
      // single alternative — and if that one was expensive the swap had nowhere
      // to go. Dislikes are filtered here so no swap can plant a blocked meal.
      const blockedHere = excludeDisliked(profile.dislikes || [])[slotKey] || [];
      const standing = interpretRules(rules).pins || [];
      const cap = profile.budget_cap || 65;
      const cur = plan[di].meals.find((m) => m.slot === a.slot);

      let candidates;
      if (a.type === "set_meal" && a.templateId) {
        if (blockedHere.includes(a.templateId)) {
          flash(`${a.templateId.replace(/_/g, " ")} uses something you won't eat`);
          return;
        }
        const tpl = list.find((t) => t.id === a.templateId);
        if (!tpl) { flash("Couldn't find that meal"); return; }
        candidates = [tpl];
      } else {
        const allowed = list.filter((t) => !blockedHere.includes(t.id));
        const different = allowed.filter((t) => t.id !== cur?.id);
        // Shuffled so an affordable swap is still a varied one, rather than always
        // landing on the single cheapest meal in the slot.
        candidates = (different.length ? different : allowed).sort(() => Math.random() - 0.5);
      }
      if (!candidates.length) { flash("Couldn't find a swap that fits your rules"); return; }

      const withMeal = (tpl) => plan.map((d, i) => (i !== di ? d : setMealOnDay(d, a.slot, tpl, targets)));
      // Two escalating attempts. Trimming portions only touches the meals already
      // on the plan; rebalancing swaps meals on OTHER days, so it is a last resort
      // and it gets called out in the toast rather than happening quietly.
      const byTrim = (tpl) => { const w = trimToBudget(withMeal(tpl), targets, cap); return { tpl, week: w, cost: weekCost(w) }; };
      const byRebalance = (tpl) => {
        const w = rebalanceAfterSwap(withMeal(tpl), targets, cap, {
          protect: [{ day: a.day, slot: a.slot }], pins: standing, blocked: excludeDisliked(profile.dislikes || []),
        });
        return { tpl, week: w, cost: weekCost(w), moved: true };
      };

      let picked = null, cheapest = null;
      const consider = (t) => { if (!cheapest || t.cost < cheapest.cost) cheapest = t; return t.cost <= cap; };
      for (const c of candidates) if (consider(byTrim(c))) { picked = cheapest; break; }
      if (!picked) for (const c of candidates) if (consider(byRebalance(c))) { picked = cheapest; break; }
      // Nothing fits, so take the least bad and say so rather than silently
      // blowing the cap — invariant 2 is the one he never wants broken quietly.
      if (!picked) picked = cheapest;
      if (!picked) { flash("Couldn't find a swap that fits your rules"); return; }

      const before = plan;
      await applyPlan(picked.week);
      const note = picked.cost > cap ? ` — £${picked.cost.toFixed(2)}, over your £${cap} cap`
        : picked.moved ? " — other meals adjusted to stay in budget" : "";
      const full = DAYS_LONG[di] || a.day;
      // Undo used to restore React state only, leaving the swap in the database.
      flash(`Swapped ${full} ${String(a.slot).toLowerCase()} to ${picked.tpl.name}${note}`, () => applyPlan(before));
      return;
    }
    if (a.type === "add_grocery") { try { await store.addCustomItem(a.name, a.quantity || ""); setCustom(await store.getCustomItems()); flash(`Added ${a.name}`); } catch {} return; }
    if (a.type === "have_enough" && a.ingredient) return toggleEnough(a.ingredient, true);
    if (a.type === "need_again" && a.ingredient) return toggleEnough(a.ingredient, false);
    if (a.type === "pantry" && a.ingredient) return pantryAction(a.ingredient, a.state);
    if (a.type === "add_rule") { try { await store.addRule(a.text, "standing"); await loadRules(); flash("Rule saved"); } catch {} return; }
    if (a.type === "add_craving") {
      try {
        await store.addRule(a.text, "craving");
        const fresh = await store.getRules();
        setRules(fresh);
        // "Add it to next week" should change next week, not wait for the next
        // time he happens to regenerate. Never touches a week already bought for.
        const key = weekStartFor(draftOffset);
        if (!shopped.some((r) => r.week_start === key)) await makePlan(draftOffset, profile, { quiet: true, rules: fresh });
        else flash("Craving noted");
      } catch {}
      return;
    }
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
      // Eating happens in the real week, never the one being browsed — you can't
      // have eaten a meal next Tuesday.
      const di = a.day ? DAYS.indexOf(a.day) : (weekOffset === 0 ? dayIdx : todayIndex());
      const date = pendingLog.current?.date || iso(dateForDay(0, di >= 0 ? di : todayIndex()));
      const slot = pendingLog.current?.slot || a.slot || "Lunch";
      const row = { log_date: date, slot, status: "ate_out", meal_name: a.description || "ate out", kcal: +a.kcal || 0, protein: +a.protein || 0, carbs: +a.carbs || 0, fat: +a.fat || 0 };
      setLogs((p) => ({ ...p, [`${date}|${row.slot}`]: row }));
      try { await store.logMeal({ date, slot: row.slot, status: "ate_out", mealName: row.meal_name, kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, note: a.description }); } catch {}
      flash(`Logged ${(DAYS_LONG[DAYS.indexOf(DAYS[di >= 0 ? di : todayIndex()])] || "today")} ${String(slot).toLowerCase()} out: ${row.meal_name}, ${row.kcal} kcal`);
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

      {confirmShop !== null && (
        <Modal onClose={() => setConfirmShop(null)} title={`Stock the pantry with ${confirmShop} item${confirmShop === 1 ? "" : "s"}?`}
          body="This records the shop for real: what you ticked goes into your kitchen, the week is marked bought, and the next list starts. There was no confirmation here before, which made it easy to do by accident.">
          <Btn kind="good" size="lg" style={{ flex: 1 }} onClick={groceriesDone}>Yes, I bought these</Btn>
          <Btn size="lg" onClick={() => setConfirmShop(null)}>Cancel</Btn>
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

        {/* ---------- PLAN ---------- */}
        {tab === "plan" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 16, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: 6 }}>
              <Btn size="sm" kind="ghost" style={{ border: "none", opacity: weekOffset <= -8 ? .3 : 1 }}
                onClick={() => { if (weekOffset > -8) { setWeekOffset((o) => o - 1); loadWeekIfNeeded(weekOffset - 1); } }}>←</Btn>
              <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{weekLabel(weekOffset)}</div>
                <div style={{ fontSize: 11.5, color: t.dim }}>
                  {dateForDay(weekOffset, 0).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {dateForDay(weekOffset, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>
              </div>
              <Btn size="sm" kind="ghost" style={{ border: "none", opacity: weekOffset >= 8 ? .3 : 1 }}
                onClick={() => { if (weekOffset < 8) { setWeekOffset((o) => o + 1); loadWeekIfNeeded(weekOffset + 1); } }}>→</Btn>
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
                    const on = i === dayIdx, isToday = weekOffset === 0 && i === todayIndex();
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
                    <MealCard key={i} meal={m} log={dayLog(m.slot)} onOpen={setOpenMeal} onMark={mark} onReplace={replaceMeal} readOnly={weekOffset !== 0} missing={missingFor(m, weekOffset, dayIdx)} />
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
        {tab === "groceries" && staleShop && (
          <div style={{ background: "rgba(245,169,98,.08)", border: `1px solid rgba(245,169,98,.35)`, borderRadius: 14, padding: "13px 15px", marginBottom: 14 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>Did you shop this week?</div>
            <div style={{ fontSize: 13, color: t.soft, lineHeight: 1.5, marginBottom: 11 }}>
              This week still reads as not bought. If you went and didn't tap “Groceries done”,
              your pantry is out of date and these amounts are too high.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn kind="good" size="sm" style={{ flex: 1 }} onClick={() => {
                setShopOffset(0); setChecked({}); dismissShopCheck();
                flash("Tick what you actually bought, then Groceries done");
              }}>I already shopped</Btn>
              <Btn size="sm" onClick={dismissShopCheck}>Not yet</Btn>
            </div>
          </div>
        )}

        {tab === "groceries" && (
          <>
            {/* One navigator for the whole tab, above everything, so the week
                you're looking at is never in doubt. Browsing here changes which
                week's data you see; it never changes what the app thinks the
                date is — that comes from weekStartFor(0) inside shopView. */}
            {preFirstShop && (
              <div style={{ background: "rgba(124,156,255,.08)", border: `1px solid rgba(124,156,255,.35)`, borderRadius: 14, padding: "13px 15px", marginBottom: 12 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 3 }}>Your first shop</div>
                <div style={{ fontSize: 13, color: t.soft, lineHeight: 1.5 }}>
                  {firstShopIn === null ? "Nothing bought yet, so the kitchen starts empty and this is the full list."
                    : firstShopIn > 1 ? `In ${firstShopIn} days, on ${new Date(profile.first_shop_date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. Nothing to do until then — the kitchen is empty, so this is the full list.`
                    : firstShopIn === 1 ? "Tomorrow. The kitchen is empty, so this is the full list."
                    : firstShopIn === 0 ? "Today. Tick things off as you go, then tap Groceries done."
                    : `Was due ${-firstShopIn} day${firstShopIn === -1 ? "" : "s"} ago. Tap Groceries done once you've been.`}
                </div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14, background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: 6 }}>
              <Btn size="sm" kind="ghost" style={{ border: "none", opacity: shopOffset <= -8 ? .3 : 1 }}
                onClick={() => { if (shopOffset > -8) { setShopOffset(shopOffset - 1); setChecked({}); } }}>←</Btn>
              <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{view.label}</div>
                <div style={{ fontSize: 11.5, color: view.bought ? t.teal : t.dim }}>
                  {preFirstShop && !view.readOnly ? "Not shopped yet" : view.status}{view.readOnly ? " · history" : ""}
                </div>
              </div>
              <Btn size="sm" kind="ghost" style={{ border: "none", opacity: shopOffset >= 8 ? .3 : 1 }}
                onClick={() => { if (shopOffset < 8) { setShopOffset(shopOffset + 1); setChecked({}); } }}>→</Btn>
            </div>
          </>
        )}

        {tab === "groceries" && !view.showList && (
          <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 16, padding: "36px 22px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
              {busy ? "Building the list…"
                : view.empty === "nothing-left" ? "Nothing left to buy"
                : view.empty === "all-covered" ? "Nothing to buy"
                : view.readOnly ? "No plan saved" : "No plan yet"}
            </div>
            <div style={{ fontSize: 14, color: t.soft, marginBottom: view.canGenerate && !busy ? 20 : 0, lineHeight: 1.5 }}>
              {busy ? `Putting ${view.label.toLowerCase()}'s meals together.`
                : view.empty === "nothing-left" ? `${view.status.replace("✓ ", "")}, and the kitchen already covers the rest of the week.`
                : view.empty === "all-covered" ? "Your pantry already covers every meal on this plan."
                : view.readOnly ? `No plan was ever saved for ${view.label.toLowerCase()}.`
                : `The list is built from ${view.label.toLowerCase()}'s meals, and there's no plan for it yet.`}
            </div>
            {view.canGenerate && !busy && <Btn kind="primary" size="lg" onClick={() => makePlan(shopOffset)}>Generate now</Btn>}
          </div>
        )}

        {tab === "groceries" && view.showList && grocery && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <h2 style={{ fontSize: 21, fontWeight: 700, margin: 0 }}>{view.readOnly ? "What you bought" : "Shopping list"}</h2>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 19, fontWeight: 600, color: grocery.estimatedTotal <= (profile.budget_cap || 65) ? t.teal : t.coral }}>£{grocery.estimatedTotal.toFixed(2)}</span>
            </div>
            <p style={{ fontSize: 13.5, color: t.soft, margin: "0 0 14px" }}>
              {grocery.items.length} items
              {view.canEditItems && ` · ${Object.values(checked).filter(Boolean).length} in basket`}
              {view.bought && !view.readOnly && <span style={{ color: t.teal }}> · already shopped, this is what's still missing</span>}
            </p>

            {view.canMarkShopped && (
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <Btn kind="solid" size="md" style={{ flex: 1 }}
                  onClick={() => setChecked(allTicked ? {} : Object.fromEntries(grocery.items.map((i) => [i.id, true])))}>
                  {allTicked ? "Clear all" : "Select all"}
                </Btn>
                <Btn kind="good" size="md" style={{ flex: 1.4 }}
                  onClick={() => setConfirmShop(grocery.items.filter((i) => checked[i.id]).length)}>Groceries done →</Btn>
              </div>
            )}

            {grocery.byAisle.map((sec) => (
              <div key={sec.aisle} style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 9 }}>{AISLE[sec.aisle]}</div>
                <div className="stack">
                  {sec.items.map((it) => (
                    <div key={it.id} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, overflow: "hidden", opacity: checked[it.id] ? .5 : 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 14px" }}>
                        <button onClick={() => view.canEditItems && setChecked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                          style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${checked[it.id] ? t.teal : t.line}`, background: checked[it.id] ? t.teal : "transparent", color: t.bg, fontWeight: 700, fontSize: 15, flexShrink: 0, opacity: view.canEditItems ? 1 : .4 }}>
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
                        {/* This lived inside the how-to-pick panel, so it only
                            existed for items that had shopping guidance and only
                            after you tapped. It's the row's second real action. */}
                        {view.canEditItems && (
                          <button onClick={(e) => { e.stopPropagation(); toggleEnough(it.id, true); }}
                            style={{ flexShrink: 0, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 100, color: t.soft, fontSize: 11.5, fontWeight: 600, padding: "7px 11px", lineHeight: 1.2 }}>
                            Have<br />enough
                          </button>
                        )}
                      </div>
                      {guide[it.id] && it.guide && (
                        <div style={{ padding: "12px 14px 14px 52px", borderTop: `1px solid ${t.line}` }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.teal, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Go for</div>
                          <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}>{it.guide.pick}</div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: t.coral, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Avoid</div>
                          <div style={{ fontSize: 14, lineHeight: 1.55 }}>{it.guide.avoid}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {haveEnough.length > 0 && view.canEditItems && (
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
              {/* A native date input: 88px of monospace text entry is not a way to
                  type a date on a phone. */}
              <Field label="First shop" type="date" value={profile.first_shop_date || ""} onSave={(v) => saveField("first_shop_date", v || null)} />
              <Field label="Max cook time (min)" type="number" value={profile.max_cook_minutes} onSave={(v) => saveField("max_cook_minutes", +v)} />
            </Section>

            <Section title="What you're going for" note="Describe it however you like — the AI reads this when planning.">
              <TextBox value={profile.goal_notes || ""} placeholder="e.g. lean and athletic, V-taper, want to lose the last bit of belly and face fat while keeping my lifts going"
                onSave={(v) => saveField("goal_notes", v)} />
            </Section>

            <Section title="Recent changes" note="Step back through what you've changed, and undo to any point.">
                {/* Lives in Settings only: it was competing for space at the top of
                    three tabs he uses constantly. The arrows browse; Undo rewinds to
                    wherever they're parked. */}
                {undoStack.length > 0 && (
              <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "10px 12px 12px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em" }}>Changes</span>
                  {undoStack.length > 1 && (
                    <span style={{ fontSize: 11.5, color: t.dim, fontFamily: "'JetBrains Mono',monospace" }}>{undoIdx + 1} of {undoStack.length}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* ← steps to older changes, → back towards the newest. */}
                  <button onClick={() => setUndoIdx((i) => Math.min(undoStack.length - 1, i + 1))}
                    disabled={undoIdx >= undoStack.length - 1}
                    style={{ background: "none", border: "none", color: undoIdx >= undoStack.length - 1 ? t.dim : t.text, fontSize: 19, padding: "2px 8px", opacity: undoIdx >= undoStack.length - 1 ? .35 : 1 }}>‹</button>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {undoStack[undoIdx]?.msg}
                  </span>
                  <button onClick={() => setUndoIdx((i) => Math.max(0, i - 1))}
                    disabled={undoIdx === 0}
                    style={{ background: "none", border: "none", color: undoIdx === 0 ? t.dim : t.text, fontSize: 19, padding: "2px 8px", opacity: undoIdx === 0 ? .35 : 1 }}>›</button>
                </div>
                <Btn size="sm" kind="solid" style={{ width: "100%", marginTop: 9 }} onClick={() => rewind(undoIdx)}>
                  {undoIdx === 0 ? "Undo" : `Undo last ${undoIdx + 1} changes`}
                </Btn>
              </div>
            )}
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
        <input type={type} value={v}
          onChange={(e) => { setV(e.target.value); if (type === "date") onSave(e.target.value); }}
          onBlur={commit} onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          style={{ width: type === "date" ? 160 : 88, background: t.cardHi, color: t.text, border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 11px", textAlign: "right", fontFamily: "'JetBrains Mono',monospace" }} />
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

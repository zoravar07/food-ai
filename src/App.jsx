import React, { useState, useEffect, useRef } from "react";
import { calculateTargets, sampleProfile, analyseDay } from "./lib/macroEngine.js";
import { generateWeek, templates } from "./lib/mealPlanner.js";
import { buildGroceryList } from "./lib/groceryListGenerator.js";
import { allIngredients, kitchenAmount, macrosFor } from "./lib/foodDatabase.js";
import { recipes } from "./lib/recipes.js";
import { askAssistant } from "./lib/assistant.js";
import * as store from "./lib/store.js";

const t = {
  bg: "#0D1117", panel: "#151B24", card: "#1B222D", cardHi: "#232C3A",
  line: "#2C3644", text: "#F0F3F7", soft: "#8D96A6", dim: "#5F6879",
  teal: "#4DD4B8", amber: "#F5A962", peri: "#7C9CFF", coral: "#FF7A7A", violet: "#B98CFF",
};
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const AISLE_LABEL = { produce: "Fruit & veg", meat: "Meat & fish", chilled: "Chilled", bakery: "Bakery", cupboard: "Cupboard" };

const todayIdx = () => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; };
function dateForIdx(i) {
  const now = new Date(); const mon = new Date(now);
  mon.setDate(now.getDate() - todayIdx());
  const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
}
const iso = (d) => d.toISOString().slice(0, 10);

function MacroBar({ label, value, target, unit, color }) {
  const pct = Math.min(100, (value / target) * 100);
  const over = value > target * 1.08;
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div className="flex justify-between items-baseline" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: over ? t.amber : t.soft }}>
          {Math.round(value)}<span style={{ color: t.dim }}>/{target}{unit}</span>
        </span>
      </div>
      <div style={{ height: 7, background: t.line, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function MealDetail({ meal, onClose }) {
  const r = recipes[meal.id];
  const mac = analyseDay([meal], allIngredients);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 20, maxWidth: 720, width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ padding: "28px 32px", borderBottom: `1px solid ${t.line}`, position: "sticky", top: 0, background: t.panel, zIndex: 2 }}>
          <div className="flex justify-between items-start gap-4">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".08em" }}>{meal.slot}</div>
              <h2 style={{ fontSize: 27, fontWeight: 700, margin: "6px 0 0", letterSpacing: "-.02em" }}>{meal.name}</h2>
              {meal.time && <div style={{ fontSize: 13.5, color: t.soft, marginTop: 6 }}>{meal.time} minutes</div>}
            </div>
            <button onClick={onClose} style={{ background: t.card, border: `1px solid ${t.line}`, color: t.soft, borderRadius: 10, width: 34, height: 34, fontSize: 19, flexShrink: 0 }}>×</button>
          </div>
        </div>
        <div style={{ padding: "24px 32px 32px" }}>
          {r?.blurb && <p style={{ fontSize: 15.5, lineHeight: 1.6, margin: "0 0 22px" }}>{r.blurb}</p>}
          <div className="flex gap-2 flex-wrap" style={{ marginBottom: 24 }}>
            {[["kcal", mac.kcal, ""], ["protein", mac.protein, "g"], ["carbs", mac.carbs, "g"], ["fat", mac.fat, "g"]].map(([k, v, u]) => (
              <div key={k} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "10px 16px" }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600 }}>{v}{u}</div>
                <div style={{ fontSize: 11, color: t.soft, textTransform: "uppercase", letterSpacing: ".05em" }}>{k}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 12px" }}>What you need</h3>
          <div style={{ background: t.card, borderRadius: 14, padding: "6px 18px", border: `1px solid ${t.line}`, marginBottom: 28 }}>
            {(meal.items || []).map(([id, qty], i) => {
              const ing = allIngredients.find((x) => x.id === id);
              if (!ing) return null;
              const mm = macrosFor(id, qty);
              return (
                <div key={i} className="flex justify-between items-baseline" style={{ padding: "12px 0", borderBottom: i < meal.items.length - 1 ? `1px solid ${t.line}` : "none", gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{kitchenAmount(id, qty)}</div>
                    <div style={{ fontSize: 13, color: t.soft, marginTop: 1 }}>{ing.name}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5 }}>{mm.kcal} kcal</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: t.coral }}>{mm.protein}g protein</div>
                  </div>
                </div>
              );
            })}
          </div>
          {r?.steps && (
            <>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 14px" }}>Method</h3>
              <div className="space-y-3" style={{ marginBottom: 24 }}>
                {r.steps.map((s, i) => (
                  <div key={i} className="flex gap-3.5">
                    <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: t.cardHi, color: t.peri, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{i + 1}</div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.65, paddingTop: 2 }}>{s}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {r?.tip && (
            <div style={{ background: "rgba(245,169,98,.09)", border: "1px solid rgba(245,169,98,.3)", borderRadius: 14, padding: "15px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.amber, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Worth knowing</div>
              <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{r.tip}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MealCard({ meal, status, log, onOpen, onMark }) {
  const done = status === "eaten", out = status === "ate_out";
  return (
    <div style={{ background: t.card, border: `1px solid ${done ? "rgba(77,212,184,.35)" : t.line}`, borderRadius: 16, display: "flex", opacity: status === "skipped" ? .5 : 1 }}>
      <div style={{ padding: "18px 0 18px 18px", display: "flex", alignItems: "flex-start" }}>
        <button onClick={(e) => { e.stopPropagation(); onMark(meal, done ? null : "eaten"); }}
          style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${done ? t.teal : t.line}`, background: done ? t.teal : "transparent", color: t.bg, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {done ? "✓" : ""}
        </button>
      </div>
      <div onClick={() => onOpen(meal)} style={{ flex: 1, padding: "18px 18px 18px 14px", cursor: "pointer", minWidth: 0 }}>
        <div className="flex items-baseline gap-2 flex-wrap" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".07em" }}>{meal.slot}</span>
          {meal.time && <span style={{ fontSize: 11.5, color: t.dim }}>{meal.time} min</span>}
          {out && <span style={{ fontSize: 11.5, color: t.amber, fontWeight: 600 }}>· ate out</span>}
        </div>
        <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", marginBottom: 5 }}>
          {out && log?.meal_name ? log.meal_name : meal.name}
        </div>
        <div style={{ fontSize: 13.5, color: t.soft }}>
          {out
            ? `${Math.round(log?.kcal || 0)} kcal · ${Math.round(log?.protein || 0)}g protein (estimated)`
            : `${Math.round(meal.kcal)} kcal · ${Math.round(meal.protein)}g protein`}
          {!out && <span style={{ color: t.peri, marginLeft: 10 }}>view recipe →</span>}
        </div>
      </div>
      <div style={{ padding: 18, display: "flex", alignItems: "center" }}>
        <button onClick={(e) => { e.stopPropagation(); onMark(meal, out ? null : "ate_out"); }}
          style={{ background: out ? "rgba(245,169,98,.15)" : "transparent", border: `1px solid ${out ? t.amber : t.line}`, color: out ? t.amber : t.soft, borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
          ate out
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("groceries");
  const [dayIdx, setDayIdx] = useState(todayIdx());
  const [targets] = useState(() => calculateTargets(sampleProfile));
  const [week, setWeek] = useState(null);
  const [history, setHistory] = useState([]);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [grocery, setGrocery] = useState(null);
  const [logs, setLogs] = useState({});
  const [checked, setChecked] = useState({});
  const [openMeal, setOpenMeal] = useState(null);
  const [expandGuide, setExpandGuide] = useState({});
  const [custom, setCustom] = useState([]);
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingAteOut, setPendingAteOut] = useState(null);
  const [ateOutText, setAteOutText] = useState("");
  const [haveEnough, setHaveEnoughState] = useState([]);
  const [confirmNew, setConfirmNew] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => { boot(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, busy]);

  async function boot() {
    try {
      const saved = await store.getWeek(store.currentWeekStart());
      if (saved?.plan) { setWeek(saved.plan); refreshGrocery(saved.plan); }
      else await makeWeek();
      try { setHistory(await store.listWeeks()); }
      catch (e) { console.error("listWeeks failed:", e); flash("Couldn't load plan history"); }
      setCustom(await store.getCustomItems());
      const he = await store.getHaveEnough();
      setHaveEnoughState(he.map((h) => h.ingredient_id));
      await loadLogs();
    } catch { await makeWeek(); }
  }

  // Pull this week's logs so the tracker shows what was ACTUALLY eaten.
  async function loadLogs() {
    try {
      const start = iso(dateForIdx(0)), end = iso(dateForIdx(6));
      const rows = await store.getLogsForRange(start, end);
      const map = {};
      rows.forEach((r) => { map[`${r.log_date}|${r.slot}`] = r; });
      setLogs(map);
    } catch {}
  }

  async function refreshGrocery(plan, heOverride) {
    let left = {};
    try { left = await store.getLeftovers(); } catch {}
    const he = heOverride ?? haveEnough;
    setGrocery(buildGroceryList(plan, left, he));
  }

  async function toggleHaveEnough(id, on) {
    const next = on ? [...haveEnough, id] : haveEnough.filter((x) => x !== id);
    setHaveEnoughState(next);
    try { await store.setHaveEnough(id, on); } catch {}
    if (week) await refreshGrocery(week, next);
    flash(on ? "Removed — you've got enough" : "Back on the list");
  }

  async function makeWeek() {
    setBusy(true); setConfirmNew(false);
    const plan = generateWeek(targets, 65);
    setWeek(plan); setViewingHistory(null); await refreshGrocery(plan);
    try {
      await store.saveWeekVersion(store.currentWeekStart(), plan, targets, 65);
      setHistory(await store.listWeeks());
    } catch (e) {
      console.error("saving plan failed:", e);
      flash("Plan generated but not saved — check Supabase setup");
    }
    setBusy(false); flash("New plan generated — old ones are still in history");
  }

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  async function mark(meal, status) {
    const date = iso(dateForIdx(dayIdx));
    if (status === "ate_out") { setAteOutText(""); setPendingAteOut({ meal, date }); return; }
    const mac = analyseDay([meal], allIngredients);
    setLogs((p) => {
      const n = { ...p };
      if (status) n[`${date}|${meal.slot}`] = { log_date: date, slot: meal.slot, status, meal_name: meal.name, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat };
      else delete n[`${date}|${meal.slot}`];
      return n;
    });
    try {
      if (status) await store.logMeal({ date, slot: meal.slot, status, mealName: meal.name, kcal: mac.kcal, protein: mac.protein, carbs: mac.carbs, fat: mac.fat });
      if (status === "eaten" && meal.items) await store.consumeIngredients(meal.items.filter(([id]) => id !== "whey"));
    } catch {}
    if (status) flash("Logged");
  }

  async function confirmAteOut(desc) {
    const { meal, date } = pendingAteOut;
    setPendingAteOut(null);
    setLogs((p) => ({ ...p, [`${date}|${meal.slot}`]: { log_date: date, slot: meal.slot, status: "ate_out", meal_name: desc || "ate out", kcal: 0, protein: 0, carbs: 0, fat: 0 } }));
    try { await store.logMeal({ date, slot: meal.slot, status: "ate_out", mealName: desc || "ate out", note: desc }); } catch {}
    flash("Logged as eaten out");
    if (desc && desc.trim()) {
      await sendMessage(`I ate out for ${meal.slot.toLowerCase()} instead of ${meal.name}. I had: ${desc}. Roughly what were the macros, and should I adjust anything for the rest of the day?`);
    }
  }

  async function sendMessage(text) {
    const next = [...chat, { role: "user", content: text }];
    setChat(next); setBusy(true);
    try {
      let pantry = [];
      try { pantry = await store.getPantry(); } catch {}
      const { reply, actions } = await askAssistant(next, { week, pantry, targets });
      setChat([...next, { role: "assistant", content: reply }]);
      for (const a of actions || []) await runAction(a);
    } catch (e) {
      setChat([...next, { role: "assistant", content: `Couldn't reach the assistant — ${e.message}` }]);
    }
    setBusy(false);
  }

  async function send() {
    const text = input.trim(); if (!text || busy) return;
    setInput(""); await sendMessage(text);
  }

  function recalc(plan) {
    return plan.map((d) => ({
      ...d,
      totals: d.meals.reduce((x, m) => ({ kcal: Math.round(x.kcal + m.kcal), protein: Math.round(x.protein + m.protein) }), { kcal: 0, protein: 0 }),
    }));
  }

  async function applyWeek(updated) {
    const fixed = recalc(updated);
    setWeek(fixed);
    await refreshGrocery(fixed);
    try { await store.saveWeek(store.currentWeekStart(), fixed, targets, 65); } catch {}
    return fixed;
  }

  async function runAction(a) {
    if (!a || !a.type) return;

    if (a.type === "regenerate_week") return makeWeek();

    if ((a.type === "swap_meal" || a.type === "set_meal") && week) {
      const di = DAYS.indexOf(a.day);
      if (di < 0) return;
      let replacement = null;

      if (a.type === "set_meal" && a.templateId) {
        const slotKey = (a.slot || "").toLowerCase();
        const tpl = (templates[slotKey] || []).find((x) => x.id === a.templateId);
        if (tpl) {
          const fresh = generateWeek(targets, 65);
          // build the chosen template with sensible portions by borrowing a generated one
          const sample = fresh.flatMap((d) => d.meals).find((m) => m.id === a.templateId);
          replacement = sample || { ...tpl, slot: a.slot, kcal: 0, protein: 0 };
        }
      } else {
        const fresh = generateWeek(targets, 65);
        const current = week[di].meals.find((m) => m.slot === a.slot);
        replacement = fresh[di].meals.find((m) => m.slot === a.slot && m.id !== current?.id)
          || fresh[di].meals.find((m) => m.slot === a.slot);
      }
      if (!replacement) return;

      await applyWeek(week.map((d, i) => i !== di ? d : { ...d, meals: d.meals.map((m) => m.slot === a.slot ? replacement : m) }));
      flash(`Updated ${a.day} ${a.slot}`);
      return;
    }

    if (a.type === "add_grocery") {
      try { await store.addCustomItem(a.name, a.quantity || ""); setCustom(await store.getCustomItems()); flash(`Added ${a.name}`); } catch {}
      return;
    }

    if (a.type === "log_estimate") {
      const di = a.day ? DAYS.indexOf(a.day) : dayIdx;
      const date = iso(dateForIdx(di >= 0 ? di : dayIdx));
      const row = {
        log_date: date, slot: a.slot || "Lunch", status: "ate_out",
        meal_name: a.description || "ate out",
        kcal: Number(a.kcal) || 0, protein: Number(a.protein) || 0,
        carbs: Number(a.carbs) || 0, fat: Number(a.fat) || 0,
      };
      setLogs((p) => ({ ...p, [`${date}|${row.slot}`]: row }));
      try {
        await store.logMeal({ date, slot: row.slot, status: "ate_out", mealName: row.meal_name,
          kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, note: a.description });
      } catch {}
      flash(`Logged ${row.kcal} kcal`);
      return;
    }

    if (a.type === "have_enough" && a.ingredient) {
      await toggleHaveEnough(a.ingredient, true);
      return;
    }

    if (a.type === "need_again" && a.ingredient) {
      await toggleHaveEnough(a.ingredient, false);
      return;
    }
  }

  const activeWeek = viewingHistory?.plan || week;
  const day = activeWeek?.[dayIdx];
  const dayMacros = day ? analyseDay(day.meals, allIngredients) : null;
  const dayLog = (slot) => logs[`${iso(dateForIdx(dayIdx))}|${slot}`];
  const dayStatus = (slot) => dayLog(slot)?.status;

  // What he has ACTUALLY eaten today: starts at zero, rises as meals are logged.
  const consumed = (() => {
    const date = iso(dateForIdx(dayIdx));
    const acc = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, potassium: 0 };
    if (!day) return acc;
    day.meals.forEach((m) => {
      const log = logs[`${date}|${m.slot}`];
      if (!log || log.status === "skipped") return;
      if (log.status === "ate_out") {
        acc.kcal += Number(log.kcal) || 0;
        acc.protein += Number(log.protein) || 0;
        acc.carbs += Number(log.carbs) || 0;
        acc.fat += Number(log.fat) || 0;
        return;
      }
      const mac = analyseDay([m], allIngredients);
      acc.kcal += mac.kcal; acc.protein += mac.protein; acc.carbs += mac.carbs;
      acc.fat += mac.fat; acc.fibre += mac.fibre; acc.potassium += mac.potassium;
    });
    return acc;
  })();

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "Inter,system-ui,-apple-system,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box}body{margin:0}button{cursor:pointer;font-family:inherit}
        input,textarea{font-family:inherit;outline:none}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${t.line};border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}
        .space-y-2>*+*{margin-top:8px}.space-y-2\\.5>*+*{margin-top:10px}.space-y-3>*+*{margin-top:12px}
        @media(max-width:1000px){.hv-shell{flex-direction:column}.hv-chat{width:100%!important;border-left:none!important;border-top:1px solid ${t.line};height:auto!important;position:static!important;max-height:70vh}.hv-main{padding:24px 20px 40px!important}.hv-head{padding:22px 20px 0!important}}`}</style>

      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: t.teal, color: t.bg, padding: "10px 20px", borderRadius: 100, fontWeight: 600, fontSize: 14, zIndex: 200 }}>{toast}</div>}
      {openMeal && <MealDetail meal={openMeal} onClose={() => setOpenMeal(null)} />}

      {confirmNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 18, padding: 28, maxWidth: 440, width: "100%" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>Generate a new plan?</h3>
            <p style={{ fontSize: 14.5, color: t.soft, margin: "0 0 20px", lineHeight: 1.55 }}>
              This builds a fresh set of meals and a new shopping list. Your current plan is kept — you can switch back to it from the week list at the top of the Plan tab.
            </p>
            <div className="flex" style={{ gap: 8 }}>
              <button onClick={makeWeek} style={{ flex: 1, padding: 12, borderRadius: 11, background: t.peri, color: t.bg, border: "none", fontWeight: 600, fontSize: 14.5 }}>Generate</button>
              <button onClick={() => setConfirmNew(false)} style={{ padding: "12px 20px", borderRadius: 11, background: "transparent", color: t.soft, border: `1px solid ${t.line}`, fontSize: 14.5 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingAteOut && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 18, padding: 28, maxWidth: 460, width: "100%" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>What did you eat?</h3>
            <p style={{ fontSize: 14, color: t.soft, margin: "0 0 18px", lineHeight: 1.5 }}>A rough description is fine — I'll estimate the macros and tell you if anything needs adjusting.</p>
            <input autoFocus value={ateOutText} onChange={(e) => setAteOutText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmAteOut(ateOutText)}
              placeholder="e.g. chicken shawarma wrap and chips"
              style={{ width: "100%", padding: "13px 15px", borderRadius: 11, background: t.card, border: `1px solid ${t.line}`, color: t.text, fontSize: 15, marginBottom: 16 }} />
            <div className="flex gap-2">
              <button onClick={() => confirmAteOut(ateOutText)}
                style={{ flex: 1, padding: 12, borderRadius: 11, background: t.teal, color: t.bg, border: "none", fontWeight: 600, fontSize: 14.5 }}>Log it</button>
              <button onClick={() => confirmAteOut("")} style={{ padding: "12px 18px", borderRadius: 11, background: "transparent", color: t.soft, border: `1px solid ${t.line}`, fontSize: 14.5 }}>Skip</button>
            </div>
          </div>
        </div>
      )}

      <div className="hv-shell" style={{ display: "flex", minHeight: "100vh" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <header className="hv-head" style={{ padding: "26px 36px 0", borderBottom: `1px solid ${t.line}` }}>
            <div className="flex items-end justify-between flex-wrap gap-4" style={{ marginBottom: 22 }}>
              <div>
                <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", margin: 0 }}>hungryvar</h1>
                <div style={{ fontSize: 13.5, color: t.soft, marginTop: 3 }}>{targets.targetKcal} kcal · {targets.protein}g protein · £65 a week</div>
              </div>
              <button onClick={() => setConfirmNew(true)} disabled={busy}
                style={{ background: t.cardHi, color: t.peri, border: `1px solid ${t.line}`, borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, opacity: busy ? .5 : 1 }}>
                {busy ? "generating…" : "new plan"}
              </button>
            </div>
            <div className="flex" style={{ gap: 4 }}>
              {["groceries", "plan"].map((x) => (
                <button key={x} onClick={() => setTab(x)}
                  style={{ background: "transparent", border: "none", borderBottom: `2px solid ${tab === x ? t.peri : "transparent"}`, color: tab === x ? t.text : t.soft, padding: "12px 18px", fontSize: 15, fontWeight: 600, textTransform: "capitalize" }}>{x}</button>
              ))}
            </div>
          </header>

          <main className="hv-main" style={{ padding: "30px 36px 60px", maxWidth: 920 }}>
            {tab === "groceries" && grocery && (
              <>
                <div className="flex justify-between items-baseline flex-wrap gap-3" style={{ marginBottom: 6 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-.02em" }}>This week's shop</h2>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 600, color: grocery.estimatedTotal <= 65 ? t.teal : t.coral }}>£{grocery.estimatedTotal.toFixed(2)}</div>
                </div>
                <p style={{ fontSize: 14.5, color: t.soft, margin: "0 0 26px" }}>
                  {grocery.items.length} things to buy · grouped by where they are in the shop · tap "how to pick" for what to look for
                </p>

                {grocery.byAisle.map((sec) => (
                  <div key={sec.aisle} style={{ marginBottom: 28 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 11 }}>{AISLE_LABEL[sec.aisle]}</div>
                    <div className="space-y-2">
                      {sec.items.map((it) => (
                        <div key={it.id} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, overflow: "hidden", opacity: checked[it.id] ? .45 : 1 }}>
                          <div className="flex items-center" style={{ padding: "15px 18px", gap: 14 }}>
                            <button onClick={() => setChecked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                              style={{ width: 24, height: 24, borderRadius: 7, border: `2px solid ${checked[it.id] ? t.teal : t.line}`, background: checked[it.id] ? t.teal : "transparent", color: t.bg, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                              {checked[it.id] ? "✓" : ""}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 600, textDecoration: checked[it.id] ? "line-through" : "none" }}>
                                <span style={{ color: t.peri, fontFamily: "'JetBrains Mono',monospace", marginRight: 9 }}>{it.display}</span>
                                {it.name}
                              </div>
                              {it.note && <div style={{ fontSize: 12.5, color: t.dim, marginTop: 2 }}>{it.note}</div>}
                              {it.longLife && !it.note && <div style={{ fontSize: 12.5, color: t.dim, marginTop: 2 }}>lasts weeks — skip if you still have some</div>}
                            </div>
                            <button onClick={() => toggleHaveEnough(it.id, true)}
                              title="Remove this — I've already got plenty"
                              style={{ background: "transparent", border: `1px solid ${t.line}`, color: t.dim, borderRadius: 8, padding: "6px 11px", fontSize: 12, whiteSpace: "nowrap" }}>
                              I have enough
                            </button>
                            {it.guide && (
                              <button onClick={() => setExpandGuide((p) => ({ ...p, [it.id]: !p[it.id] }))}
                                style={{ background: "transparent", border: `1px solid ${t.line}`, color: t.soft, borderRadius: 8, padding: "6px 11px", fontSize: 12, whiteSpace: "nowrap" }}>
                                {expandGuide[it.id] ? "hide" : "how to pick"}
                              </button>
                            )}
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: t.soft, minWidth: 50, textAlign: "right" }}>£{it.estCost.toFixed(2)}</div>
                          </div>
                          {expandGuide[it.id] && it.guide && (
                            <div style={{ padding: "14px 18px 16px 56px", borderTop: `1px solid ${t.line}` }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: t.teal, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Go for</div>
                              <div style={{ fontSize: 14.5, lineHeight: 1.6, marginBottom: 12 }}>{it.guide.pick}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: t.coral, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Avoid</div>
                              <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{it.guide.avoid}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {haveEnough.length > 0 && (
                  <div style={{ marginBottom: 26 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 11 }}>
                      You said you have enough
                    </div>
                    <div className="flex flex-wrap" style={{ gap: 8 }}>
                      {haveEnough.map((id) => {
                        const ing = allIngredients.find((x) => x.id === id);
                        return (
                          <button key={id} onClick={() => toggleHaveEnough(id, false)}
                            style={{ background: t.card, border: `1px solid ${t.line}`, color: t.soft, borderRadius: 100, padding: "8px 14px", fontSize: 13 }}>
                            {ing?.name || id} <span style={{ color: t.peri, marginLeft: 4 }}>+ add back</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <AddItem onAdd={async (n, q) => { try { await store.addCustomItem(n, q); setCustom(await store.getCustomItems()); flash("Added"); } catch { flash("Couldn't save"); } }} />

                {custom.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: t.soft, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 11 }}>Added by you</div>
                    <div className="space-y-2">
                      {custom.map((c) => (
                        <div key={c.id} className="flex items-center" style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "14px 18px", gap: 12 }}>
                          <span style={{ flex: 1, fontSize: 15.5 }}>{c.name}</span>
                          <span style={{ fontSize: 13.5, color: t.soft }}>{c.quantity}</span>
                          <button onClick={async () => { await store.deleteCustomItem(c.id); setCustom(await store.getCustomItems()); }}
                            style={{ background: "none", border: "none", color: t.dim, fontSize: 19 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === "plan" && activeWeek && day && (
              <>
                {(
                  <div className="flex items-center flex-wrap" style={{ gap: 8, marginBottom: 20 }}>
                    <span style={{ fontSize: 13, color: t.soft }}>
                      {history.length > 1 ? `Plans (${history.length}):` : "Plan:"}
                    </span>
                    <button onClick={() => setViewingHistory(null)}
                      style={{ background: !viewingHistory ? t.peri : t.card, color: !viewingHistory ? t.bg : t.soft, border: `1px solid ${!viewingHistory ? t.peri : t.line}`, borderRadius: 9, padding: "6px 13px", fontSize: 13, fontWeight: 600 }}>Current</button>
                    {history.length <= 1 && (
                      <span style={{ fontSize: 12.5, color: t.dim }}>older plans appear here once you generate a new one</span>
                    )}
                    {history.slice(1, 7).map((h, i) => {
                      const on = viewingHistory?.id === h.id;
                      const when = h.created_at ? new Date(h.created_at) : new Date(h.week_start);
                      return (
                        <button key={h.id || i} onClick={() => setViewingHistory(h)}
                          style={{ background: on ? t.peri : t.card, color: on ? t.bg : t.soft, border: `1px solid ${on ? t.peri : t.line}`, borderRadius: 9, padding: "6px 13px", fontSize: 13 }}>
                          {when.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      );
                    })}
                  </div>
                )}

                {viewingHistory && (
                  <div style={{ background: "rgba(124,156,255,.1)", border: `1px solid ${t.peri}`, borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span>Viewing an older plan — logging is disabled here.</span>
                    <button onClick={() => setViewingHistory(null)} style={{ background: t.peri, color: t.bg, border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600 }}>Back to current</button>
                  </div>
                )}

                <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 26 }}>
                  {DAYS.map((d, i) => {
                    const on = i === dayIdx, isT = i === todayIdx() && !viewingHistory;
                    return (
                      <button key={d} onClick={() => setDayIdx(i)}
                        style={{ flex: "1 1 90px", background: on ? t.cardHi : "transparent", border: `1px solid ${on ? t.peri : t.line}`, borderRadius: 14, padding: "13px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isT ? t.peri : t.soft, textTransform: "uppercase", letterSpacing: ".05em" }}>{d}</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 600 }}>{dateForIdx(i).getDate()}</span>
                      </button>
                    );
                  })}
                </div>

                {dayMacros && (
                  <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 18, padding: "24px 26px", marginBottom: 26 }}>
                    <div className="flex justify-between items-baseline flex-wrap" style={{ gap: 10, marginBottom: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>Eaten so far today</div>
                      <div style={{ fontSize: 13, color: t.dim }}>
                        if you eat the whole plan: {dayMacros.kcal} kcal · {dayMacros.protein}g protein
                      </div>
                    </div>
                    <div className="flex flex-wrap" style={{ gap: 24, marginBottom: 20 }}>
                      <MacroBar label="Calories" value={consumed.kcal} target={targets.targetKcal} unit="" color={t.amber} />
                      <MacroBar label="Protein" value={consumed.protein} target={targets.protein} unit="g" color={t.coral} />
                      <MacroBar label="Carbs" value={consumed.carbs} target={targets.carbs} unit="g" color={t.peri} />
                    </div>
                    <div className="flex flex-wrap" style={{ gap: 24 }}>
                      <MacroBar label="Fat" value={consumed.fat} target={targets.fat} unit="g" color={t.violet} />
                      <MacroBar label="Fibre" value={consumed.fibre} target={targets.fiber} unit="g" color={t.teal} />
                      <MacroBar label="Potassium" value={consumed.potassium} target={targets.potassium} unit="mg" color={t.teal} />
                    </div>
                    <div style={{ fontSize: 12.5, color: t.dim, marginTop: 16 }}>
                      Tick a meal to add it here. Nothing counts until you log it.
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  {day.meals.map((m, i) => (
                    <MealCard key={i} meal={m} status={dayStatus(m.slot)} log={dayLog(m.slot)} onOpen={setOpenMeal} onMark={viewingHistory ? () => flash("Switch to the current plan to log meals") : mark} />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>

        <aside className="hv-chat" style={{ width: 400, flexShrink: 0, borderLeft: `1px solid ${t.line}`, background: t.panel, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "22px 24px 16px", borderBottom: `1px solid ${t.line}` }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>Ask hungryvar</div>
            <div style={{ fontSize: 13, color: t.soft, marginTop: 3 }}>Swap meals, find substitutes, log what you ate</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
            {chat.length === 0 && (
              <div className="space-y-2">
                {["swap tomorrow's dinner", "they've got no avocado, what else works?", "I want something spicy tonight", "how do I stop chicken drying out?"].map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    style={{ width: "100%", textAlign: "left", background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "13px 15px", fontSize: 13.5, color: t.soft, lineHeight: 1.4 }}>{s}</button>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {chat.map((m, i) => (
                <div key={i} style={{ background: m.role === "user" ? t.cardHi : t.card, border: `1px solid ${t.line}`, borderRadius: 14, padding: "13px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: t.dim, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>{m.role === "user" ? "you" : "hungryvar"}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {busy && <div style={{ fontSize: 13.5, color: t.dim, padding: "8px 4px" }}>thinking…</div>}
              <div ref={chatEnd} />
            </div>
          </div>
          <div style={{ padding: "16px 24px 22px", borderTop: `1px solid ${t.line}` }}>
            <div className="flex" style={{ gap: 8 }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="ask anything…"
                style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "13px 15px", color: t.text, fontSize: 14 }} />
              <button onClick={send} disabled={busy}
                style={{ background: t.peri, color: t.bg, border: "none", borderRadius: 12, padding: "0 20px", fontWeight: 600, fontSize: 16, opacity: busy ? .5 : 1 }}>→</button>
            </div>
          </div>
        </aside>
      </div>

      {!store.isConfigured && (
        <div style={{ position: "fixed", bottom: 16, left: 16, background: t.cardHi, border: `1px solid ${t.amber}`, borderRadius: 12, padding: "12px 16px", fontSize: 13, color: t.soft, maxWidth: 340, zIndex: 90 }}>
          <strong style={{ color: t.amber }}>Setup needed:</strong> add your Supabase keys in Netlify to save between sessions.
        </div>
      )}
    </div>
  );
}

function AddItem({ onAdd }) {
  const [n, setN] = useState(""); const [q, setQ] = useState("");
  const submit = () => { if (n.trim()) { onAdd(n.trim(), q.trim()); setN(""); setQ(""); } };
  return (
    <div className="flex" style={{ gap: 8, marginTop: 8 }}>
      <input value={n} onChange={(e) => setN(e.target.value)} placeholder="add your own item…"
        onKeyDown={(e) => e.key === "Enter" && submit()}
        style={{ flex: 1, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "13px 16px", color: t.text, fontSize: 15 }} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="qty"
        style={{ width: 90, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, padding: "13px 14px", color: t.text, fontSize: 15 }} />
      <button onClick={submit}
        style={{ background: t.cardHi, color: t.peri, border: `1px solid ${t.line}`, borderRadius: 12, padding: "0 22px", fontWeight: 600, fontSize: 14.5 }}>Add</button>
    </div>
  );
}

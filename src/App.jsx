import React, { useState, useEffect, useRef } from "react";
import { calculateTargets, sampleProfile } from "./lib/macroEngine.js";
import { generateWeek } from "./lib/mealPlanner.js";
import { buildGroceryList } from "./lib/groceryListGenerator.js";
import { recipes } from "./lib/recipes.js";
import { askAssistant } from "./lib/assistant.js";
import * as store from "./lib/store.js";

const t = {
  bg: "#10141B", card: "#1A212C", cardAlt: "#212A38", line: "#2A3341",
  text: "#EDEFF3", textSoft: "#8B93A3", teal: "#45C4B0", amber: "#F2A65A",
  peri: "#7C9CFF", coral: "#FF6B6B",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function todayIdx() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function dateForIdx(i) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx());
  const d = new Date(monday);
  d.setDate(monday.getDate() + i);
  return d;
}

/* ---------- Macro ring, now with a visible LABEL ---------- */
function Ring({ label, value, target, unit, color, size = 92 }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.line} strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .5s ease" }} />
        <text x={size / 2} y={size / 2 - 1} textAnchor="middle"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 600, fill: t.text }}>
          {Math.round(value)}{unit}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
          style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fill: t.textSoft }}>
          /{target}{unit}
        </text>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</span>
    </div>
  );
}

function MealCard({ meal, dayDate, onLog, logStatus }) {
  const [open, setOpen] = useState(false);
  const recipe = recipes[meal.id];
  const dot = meal.standalone ? t.amber : logStatus === "eaten" ? t.teal : logStatus ? t.amber : t.peri;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: `1px solid ${t.line}` }}>
      <div className="p-4 flex gap-3 items-start">
        <div className="rounded-full flex-shrink-0 mt-1.5" style={{ width: 8, height: 8, background: dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>
              {meal.slot}
            </span>
            {meal.time && <span style={{ fontSize: 11, color: t.textSoft }}>· {meal.time} min</span>}
            {logStatus && <span style={{ fontSize: 11, color: logStatus === "eaten" ? t.teal : t.amber }}>· {logStatus.replace("_", " ")}</span>}
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, margin: "3px 0" }}>{meal.name}</div>
          <div style={{ fontSize: 12.5, color: t.textSoft }}>
            {(meal.items || []).filter(([id]) => id !== "whey").map(([id, q]) => `${id.replace(/_/g, " ")} ${q}${typeof q === "number" && q > 10 ? "g" : ""}`).join(" · ")}
          </div>
          <div className="flex gap-3 mt-2 flex-wrap">
            {recipe && (
              <button onClick={() => setOpen(!open)} className="text-xs underline" style={{ color: t.peri }}>
                {open ? "hide recipe" : "view recipe"}
              </button>
            )}
            <button onClick={() => onLog(meal, "eaten")} className="text-xs underline" style={{ color: t.teal }}>ate it</button>
            <button onClick={() => onLog(meal, "skipped")} className="text-xs underline" style={{ color: t.textSoft }}>skipped</button>
            <button onClick={() => onLog(meal, "ate_out")} className="text-xs underline" style={{ color: t.amber }}>ate out</button>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600 }}>{Math.round(meal.kcal)}</div>
          <div style={{ fontSize: 10, color: t.textSoft }}>kcal</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: t.coral, marginTop: 3 }}>{Math.round(meal.protein)}g</div>
          <div style={{ fontSize: 10, color: t.textSoft }}>protein</div>
        </div>
      </div>
      {open && recipe && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${t.line}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textSoft, textTransform: "uppercase", margin: "12px 0 6px" }}>Method</div>
          <ol style={{ fontSize: 13, lineHeight: 1.7, paddingLeft: 16 }}>
            {recipe.steps.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
          </ol>
          {recipe.tip && (
            <div className="mt-3 rounded-lg px-3 py-2" style={{ background: t.cardAlt, fontSize: 12, color: t.textSoft }}>
              <strong style={{ color: t.amber }}>Tip:</strong> {recipe.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("plan");
  const [dayIdx, setDayIdx] = useState(todayIdx());
  const [targets] = useState(() => calculateTargets(sampleProfile));
  const [week, setWeek] = useState(null);
  const [grocery, setGrocery] = useState(null);
  const [logs, setLogs] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [staples, setStaples] = useState([]);
  const [shopHistory, setShopHistory] = useState([]);
  const [checked, setChecked] = useState({});
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const chatEnd = useRef(null);

  useEffect(() => { boot(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  async function boot() {
    const ws = store.currentWeekStart();
    let saved = null;
    try { saved = await store.getWeek(ws); } catch { /* offline-safe */ }
    if (saved?.plan) {
      setWeek(saved.plan);
      refreshGrocery(saved.plan);
    } else {
      await makeWeek();
    }
    try {
      setCustomItems(await store.getCustomItems());
      setStaples(await store.getStaples());
      setShopHistory(await store.getShopHistory());
    } catch { /* not configured yet */ }
  }

  async function refreshGrocery(plan) {
    let leftovers = {};
    try { leftovers = await store.getLeftovers(); } catch {}
    setGrocery(buildGroceryList(plan, leftovers));
  }

  async function makeWeek() {
    setBusy(true);
    const plan = generateWeek(targets, 65);
    setWeek(plan);
    await refreshGrocery(plan);
    try { await store.saveWeek(store.currentWeekStart(), plan, targets, 65); } catch {}
    setBusy(false);
    show("New week generated");
  }

  function show(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function handleLog(meal, status) {
    const date = dateForIdx(dayIdx).toISOString().slice(0, 10);
    const key = `${date}|${meal.slot}`;
    setLogs((p) => ({ ...p, [key]: status }));
    try {
      await store.logMeal({ date, slot: meal.slot, status, mealName: meal.name, kcal: meal.kcal, protein: meal.protein });
      if (status === "eaten" && meal.items) await store.consumeIngredients(meal.items.filter(([id]) => id !== "whey"));
    } catch {}
    show(status === "eaten" ? "Logged" : status === "skipped" ? "Marked skipped" : "Marked as eaten out");
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next = [...chat, { role: "user", content: text }];
    setChat(next);
    setBusy(true);
    try {
      let pantry = [];
      try { pantry = await store.getPantry(); } catch {}
      const { reply, action } = await askAssistant(next, { week, pantry, targets });
      setChat([...next, { role: "assistant", content: reply }]);
      if (action) await runAction(action);
    } catch (e) {
      setChat([...next, { role: "assistant", content: `Couldn't reach the assistant: ${e.message}` }]);
    }
    setBusy(false);
  }

  async function runAction(action) {
    if (action.type === "regenerate_week") { await makeWeek(); return; }
    if (action.type === "swap_meal" && week) {
      const fresh = generateWeek(targets, 65);
      const di = DAYS.indexOf(action.day);
      if (di >= 0) {
        const replacement = fresh[di].meals.find((m) => m.slot === action.slot);
        if (replacement) {
          const updated = week.map((d, i) => i !== di ? d : {
            ...d,
            meals: d.meals.map((m) => (m.slot === action.slot ? replacement : m)),
          });
          const recalc = updated.map((d) => ({
            ...d,
            totals: d.meals.reduce((a, m) => ({ kcal: Math.round(a.kcal + m.kcal), protein: Math.round(a.protein + m.protein) }), { kcal: 0, protein: 0 }),
          }));
          setWeek(recalc);
          await refreshGrocery(recalc);
          try { await store.saveWeek(store.currentWeekStart(), recalc, targets, 65); } catch {}
          show(`Swapped ${action.day} ${action.slot}`);
        }
      }
    }
    if (action.type === "add_grocery") {
      try {
        await store.addCustomItem(action.name, action.quantity || "");
        setCustomItems(await store.getCustomItems());
        show(`Added ${action.name}`);
      } catch {}
    }
  }

  const day = week?.[dayIdx];
  const dayLogs = day ? day.meals.reduce((acc, m) => {
    const k = `${dateForIdx(dayIdx).toISOString().slice(0, 10)}|${m.slot}`;
    if (logs[k]) acc[m.slot] = logs[k];
    return acc;
  }, {}) : {};

  const carbTarget = targets.carbs;
  const dayCarbs = day ? Math.round((day.totals.kcal - day.totals.protein * 4 - targets.fat * 9) / 4) : 0;

  return (
    <div style={{ background: t.bg, minHeight: "100vh", color: t.text, fontFamily: "Inter,system-ui,sans-serif", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box} body{margin:0} button{cursor:pointer;font-family:inherit}
        input,textarea{font-family:inherit;outline:none}
        ::-webkit-scrollbar{height:6px;width:6px}::-webkit-scrollbar-thumb{background:${t.line};border-radius:3px}`}</style>

      {toast && (
        <div className="fixed left-1/2 z-50 px-4 py-2 rounded-full text-sm"
          style={{ top: 16, transform: "translateX(-50%)", background: t.teal, color: t.bg, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      <header className="px-5 pt-7 pb-4" style={{ borderBottom: `1px solid ${t.line}` }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>hungryvar</h1>
              <div style={{ fontSize: 12, color: t.textSoft }}>
                {targets.targetKcal} kcal · {targets.protein}g protein · £65/wk
              </div>
            </div>
            <button onClick={makeWeek} disabled={busy}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ background: t.cardAlt, color: t.peri, border: `1px solid ${t.line}`, opacity: busy ? .5 : 1 }}>
              {busy ? "…" : "new week"}
            </button>
          </div>
          <div className="flex gap-2">
            {["plan", "groceries", "staples", "chat"].map((x) => (
              <button key={x} onClick={() => setTab(x)}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium capitalize"
                style={{
                  background: tab === x ? t.peri : "transparent",
                  color: tab === x ? t.bg : t.textSoft,
                  border: `1px solid ${tab === x ? t.peri : t.line}`,
                }}>{x}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6">
        {tab === "plan" && week && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
              {DAYS.map((d, i) => {
                const active = i === dayIdx, isToday = i === todayIdx();
                return (
                  <button key={d} onClick={() => setDayIdx(i)}
                    className="flex flex-col items-center rounded-2xl px-3 py-2.5 flex-shrink-0"
                    style={{ minWidth: 58, background: active ? t.cardAlt : "transparent", border: `1px solid ${active ? t.peri : t.line}` }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? t.peri : t.textSoft }}>{d}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 600 }}>{dateForIdx(i).getDate()}</span>
                    <span style={{ fontSize: 9, color: t.textSoft }}>{i < todayIdx() ? "done" : isToday ? "today" : "plan"}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl p-5 mb-5 flex items-center justify-around flex-wrap gap-3"
              style={{ background: t.card, border: `1px solid ${t.line}` }}>
              <Ring label="Calories" value={day.totals.kcal} target={targets.targetKcal} unit="" color={t.amber} />
              <Ring label="Protein" value={day.totals.protein} target={targets.protein} unit="g" color={t.coral} />
              <Ring label="Carbs" value={dayCarbs} target={carbTarget} unit="g" color={t.peri} />
            </div>

            <div className="space-y-3">
              {day.meals.map((m, i) => (
                <MealCard key={i} meal={m} dayDate={dateForIdx(dayIdx)} onLog={handleLog} logStatus={dayLogs[m.slot]} />
              ))}
            </div>
          </>
        )}

        {tab === "groceries" && grocery && (
          <>
            <div className="flex items-baseline justify-between mb-1">
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>This week's shop</h2>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: grocery.estimatedTotal <= 65 ? t.teal : t.coral }}>
                £{grocery.estimatedTotal}
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: t.textSoft, marginBottom: 16 }}>
              {grocery.items.length} items · budget £65 · nets off what's already in your kitchen
            </p>

            <div className="space-y-2 mb-6">
              {grocery.items.map((it) => (
                <label key={it.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: t.card, border: `1px solid ${t.line}`, opacity: checked[it.id] ? .45 : 1 }}>
                  <input type="checkbox" checked={!!checked[it.id]}
                    onChange={() => setChecked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                    style={{ accentColor: t.teal, width: 17, height: 17 }} />
                  <span className="flex-1" style={{ fontSize: 13.5, fontWeight: 500, textDecoration: checked[it.id] ? "line-through" : "none" }}>
                    {it.name}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: t.textSoft }}>
                    {it.toBuy}{it.unit === "each" ? "" : "g"}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: t.textSoft, minWidth: 44, textAlign: "right" }}>
                    £{it.estCost.toFixed(2)}
                  </span>
                </label>
              ))}
            </div>

            <AddCustom onAdd={async (n, q) => {
              try { await store.addCustomItem(n, q); setCustomItems(await store.getCustomItems()); show("Added"); } catch { show("Not saved — set up Supabase"); }
            }} />

            {customItems.length > 0 && (
              <div className="mt-4 space-y-2">
                <div style={{ fontSize: 11, fontWeight: 600, color: t.textSoft, textTransform: "uppercase" }}>Your additions</div>
                {customItems.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: t.card, border: `1px solid ${t.line}` }}>
                    <span className="flex-1" style={{ fontSize: 13.5 }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: t.textSoft }}>{c.quantity}</span>
                    <button onClick={async () => { await store.deleteCustomItem(c.id); setCustomItems(await store.getCustomItems()); }}
                      style={{ color: t.textSoft, background: "none", border: "none", fontSize: 16 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={async () => {
              try {
                await store.saveShop(new Date().toISOString().slice(0, 10), grocery.items, grocery.estimatedTotal);
                await store.stockPantryFromShop(grocery.items);
                setShopHistory(await store.getShopHistory());
                show("Shop saved to history");
              } catch { show("Not saved — set up Supabase"); }
            }} className="w-full mt-6 py-3 rounded-xl font-semibold" style={{ background: t.teal, color: t.bg, border: "none" }}>
              Done shopping — save to history
            </button>

            {shopHistory.length > 0 && (
              <div className="mt-8">
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Shop history</h3>
                <div className="space-y-2">
                  {shopHistory.map((s) => (
                    <div key={s.id} className="rounded-xl px-3 py-2.5 flex justify-between items-center" style={{ background: t.card, border: `1px solid ${t.line}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {new Date(s.shop_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                        <div style={{ fontSize: 12, color: t.textSoft }}>{s.items?.length || 0} items</div>
                      </div>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: t.teal }}>£{s.estimated_total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === "staples" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Start-of-term staples</h2>
            <p style={{ fontSize: 12.5, color: t.textSoft, marginBottom: 16 }}>
              One-time buy when you move in. These last months — top up as they run out.
            </p>
            {staples.length === 0 && <div style={{ fontSize: 13, color: t.textSoft }}>Set up Supabase to load your staples list.</div>}
            {["Oils", "Seasoning", "Sauces", "Basics"].map((cat) => {
              const items = staples.filter((s) => s.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-5">
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textSoft, textTransform: "uppercase", marginBottom: 8 }}>{cat}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map((s) => (
                      <label key={s.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                        style={{ background: t.card, border: `1px solid ${t.line}`, opacity: s.bought ? .45 : 1 }}>
                        <input type="checkbox" checked={s.bought}
                          onChange={async () => {
                            await store.toggleStaple(s.id, !s.bought);
                            setStaples(await store.getStaples());
                          }}
                          style={{ accentColor: t.teal, width: 16, height: 16 }} />
                        <span style={{ fontSize: 13, textDecoration: s.bought ? "line-through" : "none" }}>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab === "chat" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 4px" }}>Ask hungryvar</h2>
            <p style={{ fontSize: 12.5, color: t.textSoft, marginBottom: 16 }}>
              Swap meals, find substitutes at the shop, ask what to do with leftovers.
            </p>

            {chat.length === 0 && (
              <div className="space-y-2 mb-4">
                {["swap Thursday's dinner, not feeling it", "they've got no asparagus, what else works?", "I'm craving something spicy tonight", "what can I do with the sourdough before it goes stale?"].map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl" style={{ background: t.card, border: `1px solid ${t.line}`, fontSize: 13, color: t.textSoft }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {chat.map((m, i) => (
                <div key={i} className="rounded-2xl px-4 py-3"
                  style={{
                    background: m.role === "user" ? t.cardAlt : t.card,
                    border: `1px solid ${t.line}`,
                    marginLeft: m.role === "user" ? 40 : 0,
                    marginRight: m.role === "user" ? 0 : 40,
                  }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: t.textSoft, textTransform: "uppercase", marginBottom: 4 }}>
                    {m.role === "user" ? "you" : "hungryvar"}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {busy && <div style={{ fontSize: 13, color: t.textSoft, paddingLeft: 4 }}>thinking…</div>}
              <div ref={chatEnd} />
            </div>

            <div className="flex gap-2 sticky bottom-4">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="ask anything about your food…"
                className="flex-1 px-3.5 py-3 rounded-xl"
                style={{ background: t.card, color: t.text, border: `1px solid ${t.line}`, fontSize: 14 }} />
              <button onClick={send} disabled={busy}
                className="px-5 rounded-xl font-semibold"
                style={{ background: t.peri, color: t.bg, border: "none", opacity: busy ? .5 : 1 }}>
                Send
              </button>
            </div>
          </>
        )}
      </main>

      {!store.isConfigured && (
        <div className="max-w-3xl mx-auto px-5 pb-6">
          <div className="rounded-xl px-4 py-3" style={{ background: t.cardAlt, border: `1px solid ${t.amber}`, fontSize: 12.5, color: t.textSoft }}>
            <strong style={{ color: t.amber }}>Setup needed:</strong> add your Supabase keys in Netlify to save plans, logs and shop history between sessions.
          </div>
        </div>
      )}
    </div>
  );
}

function AddCustom({ onAdd }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  return (
    <div className="flex gap-2">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="add your own item…"
        className="flex-1 px-3 py-2.5 rounded-xl" style={{ background: t.card, color: t.text, border: `1px solid ${t.line}`, fontSize: 13 }} />
      <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="qty"
        className="px-3 py-2.5 rounded-xl" style={{ width: 70, background: t.card, color: t.text, border: `1px solid ${t.line}`, fontSize: 13 }} />
      <button onClick={() => { if (name.trim()) { onAdd(name.trim(), qty.trim()); setName(""); setQty(""); } }}
        className="px-4 rounded-xl font-medium" style={{ background: t.cardAlt, color: t.peri, border: `1px solid ${t.line}`, fontSize: 13 }}>
        Add
      </button>
    </div>
  );
}

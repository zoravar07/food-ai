// src/lib/assistant.js
// Talks to the Netlify function, giving the model full context about the user's
// plan, pantry and goals so it can answer usefully — and return structured
// actions (like a meal swap) the app can actually execute.

const USER_CONTEXT = `
You are hungryvar, a personal nutrition and meal-planning assistant for one specific user.

ABOUT HIM:
- 19yo male, 6'1" (185cm), ~72.5kg, roughly 14% body fat.
- Goal: lean athletic physique — V-taper, bigger arms/chest/back, decent legs.
  Wants to lose stubborn belly and face fat while keeping/building muscle.
- Trains 5x/week: chest+bis, shoulders+tris, back+legs, shoulders+tris+bis, rest.
- Daily targets: ~2440 kcal, ~174g protein, ~73g fat, ~272g carbs.
  High potassium (debloat), moderate sodium, 30g+ fibre.
- Takes creatine daily (no calories) and one standalone whey shake.
  He does NOT like whey mixed into food — keep it as a separate drink.
- Lives at university in London (Somers Close, NW1), shares a big kitchen with 3 others.
- Weekly grocery budget: £60-65 max. Shops once a week.

FOOD PREFERENCES:
- Loves: chicken (all cuts), salmon, steak, eggs, beef/turkey mince, pork (new to cooking it).
- Carbs: rice, potatoes, sweet potato, pasta, bread/pita/wraps, oats, noodles.
- Cuisines: genuinely everything — Middle Eastern, Chinese, Japanese, Indian,
  Mediterranean, Mexican, British/American. Keep dishes SIMPLE but flavourful.
- Likes spicy food. Big foodie — hates boring/plain "diet food".
- Veg: loves leafy greens, asparagus, broccoli, cucumber, zucchini. DISLIKES CORN.
- Happy with indulgent-but-tracked meals: chicken nuggets, schnitzel, quesadillas,
  burgers, loaded potatoes. Breaded/fried is fine in moderation.
- Prefers cooking fresh, under 30 minutes. Dislikes batch-cooking and reheating leftovers.
- No allergies.

HOW TO RESPOND:
- Be concise and practical. He's cooking in a student kitchen, not writing a thesis.
- When suggesting swaps, respect his macros, budget and what's already in his pantry.
- If he says he can't find an ingredient while shopping, give 2-3 realistic UK supermarket alternatives.
- Never suggest corn. Never suggest mixing whey into food.
`;

/**
 * If the model wants the app to DO something (swap a meal, add to list),
 * it returns a JSON block. We parse it out and hand it back as an action.
 */
const ACTION_INSTRUCTIONS = `
If the user asks you to change something in the app, end your reply with a JSON
block on its own lines, wrapped exactly like this:

<<<ACTION
{"type":"swap_meal","day":"Thu","slot":"Dinner","reason":"..."}
ACTION>>>

Valid action types:
- {"type":"swap_meal","day":"Mon","slot":"Dinner","reason":"..."}
- {"type":"add_grocery","name":"Sriracha","quantity":"1 bottle"}
- {"type":"log_meal","day":"Wed","slot":"Lunch","status":"ate_out","note":"..."}
- {"type":"regenerate_week","reason":"..."}
Only include an action block if the user actually asked for a change.
Always write your normal conversational reply BEFORE the action block.
`;

export function parseAction(text) {
  const match = text.match(/<<<ACTION\s*([\s\S]*?)\s*ACTION>>>/);
  if (!match) return { reply: text.trim(), action: null };
  const reply = text.replace(match[0], "").trim();
  try {
    return { reply, action: JSON.parse(match[1]) };
  } catch {
    return { reply, action: null };
  }
}

/**
 * @param {Array<{role:string, content:string}>} messages
 * @param {Object} context - { week, pantry, targets, todayLogs }
 */
export async function askAssistant(messages, context = {}) {
  const contextBlock = `
CURRENT STATE:
${context.week ? `This week's plan:\n${summarisePlan(context.week)}` : "No plan generated yet."}

${context.pantry?.length ? `In the kitchen right now:\n${context.pantry.map((p) => `- ${p.name}: ${p.quantity}${p.unit}`).join("\n")}` : "Pantry is empty or unknown."}

${context.todayLogs?.length ? `Logged today:\n${context.todayLogs.map((l) => `- ${l.slot}: ${l.status}${l.meal_name ? ` (${l.meal_name})` : ""}`).join("\n")}` : ""}
`.trim();

  const systemPrompt = `${USER_CONTEXT}\n\n${contextBlock}\n\n${ACTION_INSTRUCTIONS}`;

  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  const { text } = await res.json();
  return parseAction(text);
}

function summarisePlan(week) {
  return week
    .map((d) => `${d.day} (${d.totals.kcal}kcal, ${d.totals.protein}g protein): ` +
      d.meals.map((m) => `${m.slot}=${m.name}`).join(", "))
    .join("\n");
}

// shopView.js
// What the Shop tab shows for the week you're browsing.
//
// Three inputs, three jobs, deliberately kept apart:
//   weekStart      which week the cursor is on
//   realWeekStart  which week it actually is, from the device clock upstream
//   bought         whether that week's shop happened, from weeks.status
//
// Past-ness comes only from comparing those two dates. Bought-ness comes only
// from shop state. Browsing can never make the app think time has moved,
// because nothing in here reads a clock — the caller supplies the real week
// once, and every screen decision is derived here rather than in the JSX.

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Weekday of a YYYY-MM-DD string, parsed as local time. Deriving the day of a
 *  supplied date is not the same as asking what day it is now, and this file
 *  never does the latter. */
function weekdayOf(isoDate) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  if (!y || !m || !d) return null;
  return DAYS[new Date(y, m - 1, d).getDay()];
}

export function shopView({ weekStart, realWeekStart, label, hasPlan, bought, boughtOn = null, itemCount = 0 }) {
  // ISO dates sort lexicographically, so no date maths is needed to order them.
  const tense = weekStart < realWeekStart ? "past" : weekStart > realWeekStart ? "future" : "current";

  // Only the past is history. A week you haven't shopped for is still live
  // whether it's this week or next — "did I shop?" is answered by shop state.
  const readOnly = tense === "past";

  const day = bought && boughtOn ? weekdayOf(boughtOn) : null;
  const status = bought
    ? (day ? `✓ Bought ${day}` : "✓ Bought")
    : readOnly ? "Not bought" : "Not yet bought";

  const showList = Boolean(hasPlan) && itemCount > 0;
  const empty = hasPlan
    ? (itemCount === 0 ? (bought ? "nothing-left" : "all-covered") : null)
    : "no-plan";

  return {
    label, tense, readOnly, bought, status, showList, empty,
    // A week you merely browsed to never builds a plan on its own; that button
    // is the only way, and history can't be fabricated after the fact.
    canGenerate: !hasPlan && !readOnly,
    canMarkShopped: showList && !readOnly,
    canEditItems: !readOnly,          // ticking things off, "I have enough"
  };
}

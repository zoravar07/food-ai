// Week helpers — a week starts on the day he last shopped, not on a weekday.
//
// Sunday used to be hardcoded as shop day. It isn't: he shops when he shops. So
// the week is no longer a calendar fact, it is a consequence of an event —
// the same shape as weeks.status, which records that a shop happened rather
// than inferring it from the date.
//
// The ANCHOR is the date of the last completed shop (or, before the first one,
// the date he expects to shop). Everything about weeks derives from it.
//
// The cycle advances when he SHOPS, never because time passed. If he's two days
// late, the current week is still the anchor week and those days sit past the
// end of the plan — visible as unplanned rather than silently rolling him into
// a week nothing was bought for.

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MS_DAY = 86400000;

/** Parse YYYY-MM-DD as a local midnight, never UTC — `new Date("2026-09-21")`
 *  is UTC midnight and lands on the 20th for anyone west of Greenwich. */
export function parseDay(isoDate) {
  const [y, m, d] = String(isoDate).split("-").map(Number);
  const x = new Date(y, (m || 1) - 1, d || 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** The seven day labels for a week starting on `anchor`, e.g. a Tuesday shop
 *  gives Tue…Mon. Every 7-day span still contains exactly one of each weekday,
 *  so a standing rule like "burger on Fridays" lands once, as it always did. */
export function daysFrom(anchor) {
  const start = parseDay(anchor).getDay();
  return Array.from({ length: 7 }, (_, i) => DAY_NAMES[(start + i) % 7]);
}

/** offset 0 = the week he's in now, -1 = the one before, +1 = the next. */
export function weekStartFor(offset, anchor) {
  const s = parseDay(anchor);
  s.setDate(s.getDate() + offset * 7);
  return iso(s);
}

export function dateForDay(offset, dayIdx, anchor) {
  const s = parseDay(anchor);
  s.setDate(s.getDate() + offset * 7 + dayIdx);
  return s;
}

/** Days since the week began. 0–6 is inside the plan; negative means the first
 *  shop hasn't come round yet; 7 or more means he's overdue and living past the
 *  end of it. Reads the clock and takes no offset, so browsing can't move it. */
export function dayOffsetToday(anchor) {
  return Math.round((today() - parseDay(anchor)) / MS_DAY);
}

/** Index into the current week's days, clamped so callers can index safely. */
export function todayIndex(anchor) {
  return Math.min(6, Math.max(0, dayOffsetToday(anchor)));
}

export function weekLabel(offset, anchor) {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  if (offset === 1) return "Next week";
  const start = dateForDay(offset, 0, anchor), end = dateForDay(offset, 6, anchor);
  const f = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

/** Where the anchor comes from, in priority order: the last shop he actually
 *  did, then the date he says his first shop will be, then today as a harmless
 *  default so the app always has a week to show. */
export function resolveAnchor({ lastShopDate, firstShopDate } = {}) {
  return lastShopDate || firstShopDate || iso(today());
}

// Week helpers — the app's week runs Sunday to Saturday.
// Sunday is shop day, so it is day one of the week being shopped for rather
// than the tail end of the week before. Everything that needs the day order
// imports DAYS from here; it used to be re-declared in four files, which is
// exactly how a change like this goes half-applied.
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The Sunday that starts the week containing `date`. */
export function weekStartOf(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());   // getDay(): 0 = Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Which day of the week it actually is, from the device clock. Takes no
 *  arguments on purpose: a function that cannot be handed a week offset cannot
 *  be fooled into thinking time moved because you browsed to another week. */
export const todayIndex = () => new Date().getDay();

export const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** offset 0 = this week, -1 = last week, +1 = next week */
export function weekStartFor(offset) {
  const s = weekStartOf();
  s.setDate(s.getDate() + offset * 7);
  return iso(s);
}

export function dateForDay(offset, dayIdx) {
  const s = weekStartOf();
  s.setDate(s.getDate() + offset * 7 + dayIdx);
  return s;
}

export function weekLabel(offset) {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  if (offset === 1) return "Next week";
  const start = dateForDay(offset, 0), end = dateForDay(offset, 6);
  const f = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

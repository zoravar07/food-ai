// Week helpers — the app's week runs Monday to Sunday.
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function mondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

export const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

/** offset 0 = this week, -1 = last week, +1 = next week */
export function weekStartFor(offset) {
  const m = mondayOf();
  m.setDate(m.getDate() + offset * 7);
  return iso(m);
}

export function dateForDay(offset, dayIdx) {
  const m = mondayOf();
  m.setDate(m.getDate() + offset * 7 + dayIdx);
  return m;
}

export function weekLabel(offset) {
  if (offset === 0) return "This week";
  if (offset === -1) return "Last week";
  if (offset === 1) return "Next week";
  const start = dateForDay(offset, 0), end = dateForDay(offset, 6);
  const f = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${f(start)} – ${f(end)}`;
}

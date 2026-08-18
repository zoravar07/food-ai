// macroEngine.js
// Computes daily calorie & macro targets from the user's stats and goal.
// This replaces the hard-coded "2475 kcal / 180g protein" numbers used in the preview —
// in the real app these are DERIVED, and recalculate if stats change.

/**
 * @param {Object} profile
 * @param {number} profile.age
 * @param {number} profile.heightCm
 * @param {number} profile.weightKg
 * @param {"male"|"female"} profile.sex
 * @param {number} profile.trainingDaysPerWeek
 * @param {"maintain"|"mild_cut"|"cut"|"recomp"} profile.goal
 */
export function calculateTargets(profile) {
  const { age, heightCm, weightKg, sex, trainingDaysPerWeek, goal } = profile;

  // Mifflin-St Jeor BMR
  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  // Activity multiplier scales with training frequency (student lifestyle assumed moderately active on non-gym days)
  const activityMultiplier = trainingDaysPerWeek >= 5 ? 1.55 : trainingDaysPerWeek >= 3 ? 1.45 : 1.35;
  const maintenance = bmr * activityMultiplier;

  const deficitPct = { maintain: 0, recomp: 0.08, mild_cut: 0.12, cut: 0.2 }[goal] ?? 0.1;
  const targetKcal = Math.round(maintenance * (1 - deficitPct));

  // Protein: 2.4g/kg — high end, appropriate for a lean individual in a deficit trying to hold/build muscle
  const proteinG = Math.round(weightKg * 2.4);
  const proteinKcal = proteinG * 4;

  // Fat: ~27% of total calories (hormonal health floor)
  const fatKcal = Math.round(targetKcal * 0.27);
  const fatG = Math.round(fatKcal / 9);

  // Carbs: remainder
  const carbKcal = targetKcal - proteinKcal - fatKcal;
  const carbG = Math.round(carbKcal / 4);

  return {
    maintenanceKcal: Math.round(maintenance),
    targetKcal,
    protein: proteinG,
    fat: fatG,
    carbs: carbG,
    fiber: 32, // general target, g/day
    potassium: 4200, // mg/day, upper-normal range for a "debloat" emphasis
    sodium: 2200, // mg/day, moderate — not aggressively low since he trains and sweats
  };
}

// Example: 19M, 185cm, 72.5kg, trains 5x/week, mild recomp-style cut
export const sampleProfile = {
  age: 19,
  heightCm: 185,
  weightKg: 72.5,
  sex: "male",
  trainingDaysPerWeek: 5,
  goal: "mild_cut",
};

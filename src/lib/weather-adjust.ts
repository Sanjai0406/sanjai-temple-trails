import type { ItineraryDay } from "@/lib/trips.functions";
import type { DayForecast } from "@/lib/weather.functions";

export type DayChange = {
  key: keyof ItineraryDay;
  label: string;
  from?: string;
  to: string;
  reason: string;
};

export type AdjustedDay = {
  values: Partial<Record<keyof ItineraryDay, string>>;
  changes: DayChange[];
  headline?: string;
};

const wet = (f: DayForecast) => {
  const c = (f.condition ?? "").toLowerCase();
  return (f.rain ?? 0) >= 55 || /rain|thunder|storm|drizzle|shower/.test(c);
};
const drizzly = (f: DayForecast) => (f.rain ?? 0) >= 30 && (f.rain ?? 0) < 55;
const hot = (f: DayForecast) => (f.max ?? 0) >= 34;
const cold = (f: DayForecast) => (f.min ?? 99) <= 12;

/** Rule-based re-shuffle of a planned day so it fits the forecast. */
export function adjustDayForWeather(day: ItineraryDay, f?: DayForecast): AdjustedDay {
  const out: AdjustedDay = { values: {}, changes: [] };
  if (!f) return out;

  const push = (key: keyof ItineraryDay, label: string, to: string, reason: string) => {
    const from = day[key] as string | undefined;
    if (from === to) return;
    out.values[key] = to;
    out.changes.push({ key, label, from, to, reason });
  };

  if (wet(f)) {
    out.headline = `Rain likely (${f.rain ?? "high"}% chance) — indoor-first day`;
    if (day.scenic)
      push("scenic", "Afternoon", `Indoor swap: ${day.scenic} → covered mandapam, temple museum or heritage hall nearby`, "Heavy rain expected in the afternoon");
    if (day.sunset)
      push("sunset", "Sunset", `Skip the open sunset point (${day.sunset}) — attend evening deeparadhanai / aarti inside the temple instead`, "Cloud cover and rain will hide the sunset");
    if (day.morning)
      push("morning", "Morning", `${day.morning} — leave 30 min early, roads flood after showers`, "Rain slows travel");
    push("notes", "Notes", `${day.notes ? day.notes + " " : ""}Carry a poncho, waterproof bag for phone/camera and non-slip footwear; temple stone floors get slippery.`, "Wet weather kit");
  } else if (drizzly(f)) {
    out.headline = `Passing showers possible (${f.rain}%) — keep a backup indoor stop`;
    push("notes", "Notes", `${day.notes ? day.notes + " " : ""}Pack a compact umbrella; keep the afternoon flexible in case of a shower.`, "Scattered showers");
  }

  if (hot(f)) {
    out.headline = out.headline ?? `Hot day (${Math.round(f.max ?? 0)}°C) — beat the heat schedule`;
    if (day.morning)
      push("morning", "Morning", `Start by 5:30–6:00 AM: ${day.morning}`, `High of ${Math.round(f.max ?? 0)}°C — front-load outdoor time`);
    if (day.temple)
      push("temple", "Temple", `${day.temple} — finish darshan before 11 AM (stone floors burn barefoot by noon)`, "Midday heat");
    if (day.scenic && !out.values.scenic)
      push("scenic", "Afternoon", `Rest / indoor break till 4 PM, then ${day.scenic}`, "Avoid 12–4 PM sun");
    push("notes", "Notes", `${out.values.notes ?? day.notes ?? ""} Carry 2L water, ORS and a cotton scarf for your head.`.trim(), "Heat precautions");
  }

  if (cold(f)) {
    out.headline = out.headline ?? `Chilly morning (${Math.round(f.min ?? 0)}°C) — start a little later`;
    if (day.morning)
      push("morning", "Morning", `${out.values.morning ?? day.morning} — start around 7:30 AM once the mist clears`, `Low of ${Math.round(f.min ?? 0)}°C`);
    push("notes", "Notes", `${out.values.notes ?? day.notes ?? ""} Carry a fleece/shawl — temple corridors stay cold.`.trim(), "Cold morning");
  }

  if (!out.changes.length && f.max != null) {
    out.headline = `Clear conditions (${Math.round(f.max)}°C) — plan stays as-is`;
  }
  return out;
}

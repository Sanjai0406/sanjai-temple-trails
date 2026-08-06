import { createServerFn } from "@tanstack/react-start";

// Uses Google Maps Platform Weather API via the connector gateway.
// No user-supplied keys needed.
export const getWeather = createServerFn({ method: "GET" })
  .inputValidator((data: { lat: number; lng: number } | undefined) => data ?? { lat: 13.0827, lng: 80.2707 })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !apiKey) {
      return { ok: false as const, error: "Maps not configured" };
    }
    try {
      const url = `https://connector-gateway.lovable.dev/google_maps/weather/v1/currentConditions:lookup?location.latitude=${data.lat}&location.longitude=${data.lng}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": apiKey },
      });
      if (!res.ok) return { ok: false as const, error: `Weather ${res.status}` };
      const json = (await res.json()) as {
        temperature?: { degrees?: number };
        feelsLikeTemperature?: { degrees?: number };
        relativeHumidity?: number;
        wind?: { speed?: { value?: number } };
        weatherCondition?: { description?: { text?: string }; type?: string };
      };
      return {
        ok: true as const,
        temp: json.temperature?.degrees,
        feels: json.feelsLikeTemperature?.degrees,
        humidity: json.relativeHumidity,
        wind: json.wind?.speed?.value,
        condition: json.weatherCondition?.description?.text ?? json.weatherCondition?.type,
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Weather failed" };
    }
  });

export type DayForecast = {
  date: string; // yyyy-mm-dd
  max?: number;
  min?: number;
  condition?: string;
  icon?: string;
  rain?: number;
  humidity?: number;
};

/** Daily forecast for a place name (max 10 days ahead), used by the trip planner. */
export const getTripForecast = createServerFn({ method: "GET" })
  .inputValidator((data: { place: string; days: number; startDate?: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!key || !apiKey) return { ok: false as const, error: "Maps not configured", days: [] as DayForecast[] };
    const headers = { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": apiKey };
    const base = "https://connector-gateway.lovable.dev/google_maps";
    try {
      let lat = 13.0827;
      let lng = 80.2707;
      if (data.place) {
        const g = await fetch(`${base}/maps/api/geocode/json?address=${encodeURIComponent(data.place)}`, { headers });
        if (g.ok) {
          const gj = (await g.json()) as { results?: { geometry?: { location?: { lat: number; lng: number } } }[] };
          const loc = gj.results?.[0]?.geometry?.location;
          if (loc) { lat = loc.lat; lng = loc.lng; }
        }
      }
      const n = Math.min(Math.max(data.days, 1), 10);
      const res = await fetch(
        `${base}/weather/v1/forecast/days:lookup?days=${n}&location.latitude=${lat}&location.longitude=${lng}`,
        { headers },
      );
      if (!res.ok) return { ok: false as const, error: `Forecast ${res.status}`, days: [] as DayForecast[] };
      const json = (await res.json()) as {
        forecastDays?: {
          displayDate?: { year: number; month: number; day: number };
          maxTemperature?: { degrees?: number };
          minTemperature?: { degrees?: number };
          daytimeForecast?: {
            weatherCondition?: { description?: { text?: string }; type?: string; iconBaseUri?: string };
            precipitation?: { probability?: { percent?: number } };
            relativeHumidity?: number;
          };
        }[];
      };
      const days: DayForecast[] = (json.forecastDays ?? []).map((d) => {
        const dd = d.displayDate;
        const date = dd ? `${dd.year}-${String(dd.month).padStart(2, "0")}-${String(dd.day).padStart(2, "0")}` : "";
        return {
          date,
          max: d.maxTemperature?.degrees,
          min: d.minTemperature?.degrees,
          condition: d.daytimeForecast?.weatherCondition?.description?.text ?? d.daytimeForecast?.weatherCondition?.type,
          icon: d.daytimeForecast?.weatherCondition?.iconBaseUri
            ? `${d.daytimeForecast.weatherCondition.iconBaseUri}.svg`
            : undefined,
          rain: d.daytimeForecast?.precipitation?.probability?.percent,
          humidity: d.daytimeForecast?.relativeHumidity,
        };
      });
      return { ok: true as const, days };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Forecast failed", days: [] as DayForecast[] };
    }
  });

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

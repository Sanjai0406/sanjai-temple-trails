import type { DayForecast } from "@/lib/weather.functions";
import { CloudSun, Droplets } from "lucide-react";

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export function DayWeather({
  date,
  forecast,
  seasonLabel,
}: {
  date?: string;
  forecast?: DayForecast;
  seasonLabel?: string;
}) {
  if (!date) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="rounded-full border border-border bg-card px-2 py-0.5">{fmtDate(date)}</span>
      {forecast ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5">
          {forecast.icon ? (
            <img src={forecast.icon} alt="" aria-hidden className="size-4" loading="lazy" />
          ) : (
            <CloudSun className="size-3.5 text-primary" />
          )}
          <span className="text-foreground font-medium">
            {forecast.max != null ? `${Math.round(forecast.max)}°` : "—"}
            {forecast.min != null ? ` / ${Math.round(forecast.min)}°` : ""}
          </span>
          {forecast.condition && <span>· {forecast.condition}</span>}
          {forecast.rain != null && (
            <span className="inline-flex items-center gap-0.5">
              <Droplets className="size-3" />
              {forecast.rain}%
            </span>
          )}
        </span>
      ) : (
        <span className="rounded-full border border-dashed border-border px-2 py-0.5">
          {seasonLabel ? `Typical ${seasonLabel.replace(/^\S+\s/, "")} weather` : "Forecast available closer to the date"}
        </span>
      )}
    </div>
  );
}

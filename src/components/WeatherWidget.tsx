import { useQuery } from "@tanstack/react-query";
import { getWeather } from "@/lib/weather.functions";
import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";

export function WeatherWidget({ lat = 13.0827, lng = 80.2707, place = "Chennai" }: { lat?: number; lng?: number; place?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["weather", lat, lng],
    queryFn: () => getWeather({ data: { lat, lng } }),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Weather · {place}</div>
        <Cloud className="size-4 text-primary" />
      </div>
      {isLoading ? (
        <div className="h-16 animate-pulse bg-muted rounded-lg" />
      ) : data?.ok ? (
        <>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-display font-bold">{Math.round(data.temp ?? 0)}°</div>
            <div className="text-sm text-muted-foreground">{data.condition}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><Thermometer className="size-3" />Feels {Math.round(data.feels ?? 0)}°</div>
            <div className="flex items-center gap-1"><Droplets className="size-3" />{data.humidity ?? "—"}%</div>
            <div className="flex items-center gap-1"><Wind className="size-3" />{Math.round(data.wind ?? 0)} km/h</div>
          </div>
        </>
      ) : (
        <div className="text-sm text-muted-foreground">Weather unavailable</div>
      )}
    </div>
  );
}

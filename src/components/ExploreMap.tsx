import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { MapPin, Star, X } from "lucide-react";
import { TempleImage } from "@/components/TempleImage";

export type MapPlace = {
  slug: string;
  name: string;
  city: string | null;
  state: string;
  hero_image: string | null;
  rating: number | null;
  deity?: string | null;
  latitude: number | null;
  longitude: number | null;
};

function FitBounds({ places }: { places: MapPlace[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || places.length === 0) return;
    const g = (window as unknown as { google?: any }).google;
    if (!g?.maps) return;
    const bounds = new g.maps.LatLngBounds();
    places.forEach((p) => bounds.extend({ lat: Number(p.latitude), lng: Number(p.longitude) }));
    if (places.length === 1) map.setCenter(bounds.getCenter()), map.setZoom(9);
    else map.fitBounds(bounds, 48);
  }, [map, places]);
  return null;
}

export function ExploreMap({ places }: { places: MapPlace[] }) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const pins = useMemo(
    () => places.filter((p) => p.latitude != null && p.longitude != null),
    [places],
  );
  const active = pins.find((p) => p.slug === activeSlug) ?? null;

  useEffect(() => {
    if (activeSlug && !pins.some((p) => p.slug === activeSlug)) setActiveSlug(null);
  }, [pins, activeSlug]);

  if (!key) {
    return (
      <div className="h-[60vh] rounded-2xl border border-border grid place-items-center text-sm text-muted-foreground">
        Map unavailable — no maps key configured.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border">
      <APIProvider apiKey={key}>
        <Map
          defaultCenter={{ lat: 11.1, lng: 78.6 }}
          defaultZoom={6}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          style={{ width: "100%", height: "60vh" }}
        >
          <FitBounds places={pins} />
          {pins.map((p) => (
            <Marker
              key={p.slug}
              position={{ lat: Number(p.latitude), lng: Number(p.longitude) }}
              title={p.name}
              onClick={() => setActiveSlug(p.slug)}
            />
          ))}
          {active && (
            <InfoWindow
              position={{ lat: Number(active.latitude), lng: Number(active.longitude) }}
              onCloseClick={() => setActiveSlug(null)}
              headerDisabled
            >
              <div className="w-56">
                <Link to="/temple/$slug" params={{ slug: active.slug }} className="block group">
                  <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                    <TempleImage
                      slug={active.slug}
                      src={active.hero_image}
                      alt={active.name}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="mt-2 font-display font-semibold text-sm leading-tight text-foreground group-hover:text-primary">
                    {active.name}
                  </div>
                  {active.deity && <div className="text-[11px] text-primary">{active.deity}</div>}
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {active.city ? `${active.city}, ${active.state}` : active.state}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-gold text-gold" />
                      {active.rating ?? "4.5"}
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-medium text-primary">View details →</div>
                </Link>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      <div className="absolute top-3 left-3 glass rounded-full px-3 py-1.5 text-xs font-medium">
        {pins.length} pin{pins.length === 1 ? "" : "s"}
        {pins.length < places.length && (
          <span className="text-muted-foreground"> · {places.length - pins.length} without coordinates</span>
        )}
      </div>
      {active && (
        <button
          onClick={() => setActiveSlug(null)}
          className="absolute top-3 right-3 glass rounded-full p-1.5"
          aria-label="Close details"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

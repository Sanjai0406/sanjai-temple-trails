export function MapEmbed({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  if (!key) {
    return (
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noreferrer"
        className="block aspect-video rounded-xl gradient-hero grid place-items-center text-primary-foreground"
      >
        Open in Google Maps →
      </a>
    );
  }
  const src = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(name)}&center=${lat},${lng}&zoom=15`;
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <iframe
        src={src}
        title={`Map of ${name}`}
        width="100%"
        height="320"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        style={{ border: 0 }}
      />
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { TempleImage } from "@/components/TempleImage";

type Temple = {
  slug: string;
  name: string;
  city: string | null;
  state: string;
  category: string;
  hero_image: string | null;
  rating: number | null;
  deity?: string | null;
  is_unesco?: boolean | null;
  is_hidden_gem?: boolean | null;
};

export function TempleCard({ t }: { t: Temple }) {
  return (
    <Link
      to="/temple/$slug"
      params={{ slug: t.slug }}
      className="temple-card hover:temple-card-hover overflow-hidden group block"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {t.hero_image ? (
          <img
            src={t.hero_image}
            alt={t.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="size-full gradient-hero" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex gap-1.5">
          {t.is_unesco && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold text-temple font-semibold">UNESCO</span>}
          {t.is_hidden_gem && <span className="text-[10px] px-2 py-0.5 rounded-full bg-temple text-primary-foreground font-semibold">Hidden Gem</span>}
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs bg-black/40 backdrop-blur px-2 py-1 rounded-full text-white">
          <Star className="size-3 fill-gold text-gold" />
          {t.rating ?? "4.5"}
        </div>
      </div>
      <div className="p-3.5">
        <div className="font-display font-semibold leading-tight line-clamp-1">{t.name}</div>
        {t.deity && <div className="text-xs text-primary mt-0.5">{t.deity}</div>}
        <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <MapPin className="size-3" />
          {t.city ? `${t.city}, ${t.state}` : t.state}
        </div>
      </div>
    </Link>
  );
}

import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTemple, nearbyTemples } from "@/lib/temples.functions";
import { addToWishlist, addVisited } from "@/lib/profile.functions";
import { refreshTemplePhoto } from "@/lib/temple-photo.functions";
import { TempleImage } from "@/components/TempleImage";
import { TemplePhotoRepairLog } from "@/components/TemplePhotoRepairLog";
import { WeatherWidget } from "@/components/WeatherWidget";
import { MapEmbed } from "@/components/MapEmbed";
import { ArrowLeft, Heart, CheckCircle2, MapPin, Clock, Shirt, Star, IndianRupee, RefreshCw, Share2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/temple/$slug")({
  loader: async ({ params, context }) => {
    const row = await context.queryClient.ensureQueryData({
      queryKey: ["temple", params.slug],
      queryFn: () => getTemple({ data: { slug: params.slug } }),
    });
    if (!row) throw notFound();
    return row;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Temple"} · Sanjai's Travel AI` },
      { name: "description", content: loaderData?.description?.slice(0, 160) ?? "Temple details, map, weather and dress code." },
    ],
  }),
  component: TempleDetail,
});

function TempleDetail() {
  const slug = Route.useParams().slug;
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["temple", slug], queryFn: () => getTemple({ data: { slug } }) });
  const [authed, setAuthed] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user)); }, []);

  const wishMut = useMutation({
    mutationFn: () => addToWishlist({ data: { temple_id: t!.id } }),
    onSuccess: () => { toast.success("Added to wishlist 💛"); qc.invalidateQueries({ queryKey: ["wishlist"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const visitMut = useMutation({
    mutationFn: () => addVisited({ data: { temple_id: t!.id, place_name: t!.name, place_state: t!.state } }),
    onSuccess: () => { toast.success("Marked as visited ✅"); qc.invalidateQueries({ queryKey: ["visited"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const refreshMut = useMutation({
    mutationFn: () => refreshTemplePhoto({ data: { slug } }),
    onSuccess: () => {
      toast.success("Photo refreshed from Google 📸");
      qc.invalidateQueries({ queryKey: ["temple", slug] });
      qc.invalidateQueries({ queryKey: ["temples"] });
      qc.invalidateQueries({ queryKey: ["featured"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: nearby } = useQuery({
    queryKey: ["nearby", slug],
    queryFn: () => nearbyTemples({ data: { slug, limit: 6 } }),
    enabled: !!t,
  });

  const onShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const nav = window.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    const shareData: ShareData = { title: t?.name ?? "Sanjai's Travel AI", text: `Discover ${t?.name} on Sanjai's Travel AI`, url };
    try {
      if (nav.share) {
        await nav.share(shareData);
      } else {
        await nav.clipboard.writeText(url);
        toast.success("Link copied to clipboard 🔗");
      }
    } catch { /* user cancelled */ }
  };

  if (!t) return null;
  const lat = Number(t.latitude ?? 13.0827);
  const lng = Number(t.longitude ?? 80.2707);

  return (
    <div>
      <div className="relative aspect-[16/8] sm:aspect-[16/6] overflow-hidden">
        <TempleImage slug={t.slug} src={t.hero_image} alt={t.name} loading="eager" className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-temple/40" />
        <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between">
          <Link to="/explore" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-sm">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <button
            onClick={() => authed ? refreshMut.mutate() : toast.info("Sign in to refresh photo")}
            disabled={refreshMut.isPending}
            title="Re-fetch photo from Google Maps"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-xs font-medium hover:bg-white/30 transition disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${refreshMut.isPending ? "animate-spin" : ""}`} />
            {refreshMut.isPending ? "Refreshing…" : "Refresh photo"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 -mt-20 relative">
        <div className="temple-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex gap-2">
                {t.is_unesco && <span className="text-xs px-2 py-0.5 rounded-full bg-gold text-temple font-semibold">UNESCO</span>}
                {t.is_hidden_gem && <span className="text-xs px-2 py-0.5 rounded-full bg-temple text-primary-foreground font-semibold">Hidden Gem</span>}
                {t.architecture && <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground font-semibold">{t.architecture}</span>}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold mt-2">{t.name}</h1>
              {t.deity && <div className="text-primary mt-1">{t.deity}</div>}
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="size-3" />{t.city}, {t.state}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => authed ? wishMut.mutate() : toast.info("Sign in to save")}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-sm font-medium inline-flex items-center gap-1 transition hover:-translate-y-0.5"
              ><Heart className="size-4 text-primary" /> Wishlist</button>
              <button
                onClick={() => authed ? visitMut.mutate() : toast.info("Sign in to save")}
                className="px-4 py-2 rounded-xl gradient-hero text-primary-foreground text-sm font-medium inline-flex items-center gap-1 transition hover:-translate-y-0.5 animate-gold-glow"
              ><CheckCircle2 className="size-4" /> Visited</button>
              <button
                onClick={onShare}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent text-sm font-medium inline-flex items-center gap-1 transition hover:-translate-y-0.5"
              ><Share2 className="size-4" /> Share</button>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-6 text-sm">
            <Stat icon={Star} label="Rating" value={`${t.rating ?? "4.5"} / 5`} />
            <Stat icon={Clock} label="Timings" value={t.timing ?? "5 AM – 9 PM"} />
            <Stat icon={Shirt} label="Dress" value={t.dress_code ?? "Traditional"} />
            <Stat icon={IndianRupee} label="Budget" value={t.estimated_budget ? `₹${t.estimated_budget}` : "Free"} />
          </div>

          {t.description && (
            <div className="mt-6">
              <h2 className="font-display text-xl font-semibold">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 whitespace-pre-line">{t.description}</p>
            </div>
          )}

          {t.history && (
            <div className="mt-6">
              <h2 className="font-display text-xl font-semibold">History & Significance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 whitespace-pre-line">{t.history}</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-4 mt-6">
          <div className="temple-card p-4">
            <h3 className="font-display text-lg font-semibold mb-3">Location</h3>
            <MapEmbed lat={lat} lng={lng} name={t.name} />
            <div className="mt-3 flex gap-2 text-sm">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">Get directions</a>
              <a href={`https://www.google.com/maps/search/?api=1&query=hotels+near+${encodeURIComponent(t.name)}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-border">Nearby hotels</a>
            </div>
          </div>
          <WeatherWidget lat={lat} lng={lng} place={t.city ?? t.state} />
        </div>

        {/* NEARBY DESTINATIONS */}
        {nearby && nearby.length > 0 && (
          <div className="mt-8 mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="size-4 text-primary" />
              <h3 className="font-display text-xl font-semibold">Nearby destinations</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
              {nearby.map((n) => (
                <Link
                  key={n.slug}
                  to="/temple/$slug"
                  params={{ slug: n.slug }}
                  className="temple-card hover:temple-card-hover overflow-hidden group flex"
                >
                  <div className="relative w-24 sm:w-28 shrink-0 bg-muted">
                    <TempleImage slug={n.slug} src={n.hero_image} alt={n.name} loading="lazy" className="size-full object-cover group-hover:scale-105 transition duration-500" />
                  </div>
                  <div className="p-3 flex-1 min-w-0">
                    <div className="font-display font-semibold text-sm leading-tight line-clamp-1">{n.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <MapPin className="size-3" />{n.city}, {n.state}
                    </div>
                    <div className="text-[11px] text-primary font-medium mt-1">{n.distance_km} km away</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Icon className="size-3" />{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}

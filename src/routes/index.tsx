import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, MessageCircle, MapPin, Heart, CheckCircle2, Sun, Calendar } from "lucide-react";
import heroImg from "@/assets/hero-temple.jpg";
import { supabase } from "@/integrations/supabase/client";
import { featuredTemples } from "@/lib/temples.functions";
import { TempleCard } from "@/components/TempleCard";
import { WeatherWidget } from "@/components/WeatherWidget";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["featured"], queryFn: () => featuredTemples() }),
  component: HomePage,
});

const QUICK = [
  { to: "/planner", label: "One Day Trip", icon: Sun, hint: "Morning to night" },
  { to: "/planner", label: "Weekend Trip", icon: Calendar, hint: "2-3 days" },
  { to: "/explore", label: "Temple Search", icon: Compass, hint: "Browse all" },
  { to: "/explore", label: "Explore India", icon: MapPin, hint: "By state" },
  { to: "/wishlist", label: "Wishlist", icon: Heart, hint: "Saved places" },
  { to: "/visited", label: "Visited", icon: CheckCircle2, hint: "Travel log" },
  { to: "/chat", label: "AI Chat", icon: MessageCircle, hint: "Temple Explorer" },
];

function HomePage() {
  const { data: temples } = useQuery({ queryKey: ["featured"], queryFn: () => featuredTemples() });
  const [name, setName] = useState("Sanjai");
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.full_name?.split(" ")[0] ?? "Sanjai";
      setName(n);
    });
  }, []);

  const today = temples?.[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Temple at dawn" width={1920} height={1280} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-temple/40 via-temple/60 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 sm:pt-24 sm:pb-32 text-primary-foreground">
          <div className="text-sm font-medium opacity-90">Vanakkam, {name} 🙏</div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] mt-2 max-w-3xl">
            Your spiritual<br /> journey across <span className="text-gold">Bharat</span> begins here.
          </h1>
          <p className="mt-4 max-w-xl text-base sm:text-lg opacity-90">
            Discover famous, hidden and ancient temples, hill stations, waterfalls and heritage sites — planned by AI, tailored for you.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); navigate({ to: "/explore", search: { q } as never }); }}
            className="mt-6 max-w-xl flex gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search temple, city, deity, district…"
              className="flex-1 h-12 rounded-xl bg-white/95 text-foreground px-4 outline-none focus:ring-2 focus:ring-gold"
            />
            <button className="h-12 px-5 rounded-xl bg-gold text-temple font-semibold inline-flex items-center gap-1">
              Search <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link to="/chat" className="px-4 py-2 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 border border-white/20">💬 Ask Temple Explorer AI</Link>
            <Link to="/planner" className="px-4 py-2 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 border border-white/20">🗺️ Plan a trip</Link>
            <Link to="/explore" search={{ category: "unesco" } as never} className="px-4 py-2 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 border border-white/20">🏛️ UNESCO sites</Link>
          </div>
        </div>
      </section>

      {/* QUICK + WEATHER */}
      <section className="mx-auto max-w-7xl px-4 -mt-12 relative grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Quick actions</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK.map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="group p-3 rounded-xl border border-border bg-card hover:bg-accent transition flex flex-col gap-1"
              >
                <q.icon className="size-5 text-primary group-hover:scale-110 transition" />
                <div className="text-sm font-medium leading-tight">{q.label}</div>
                <div className="text-[11px] text-muted-foreground">{q.hint}</div>
              </Link>
            ))}
          </div>
        </div>
        <WeatherWidget />
      </section>

      {/* TODAY'S SUGGESTION */}
      {today && (
        <section className="mx-auto max-w-7xl px-4 mt-12">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Today's suggestion</div>
          <Link
            to="/temple/$slug"
            params={{ slug: today.slug }}
            className="mt-3 grid sm:grid-cols-2 gap-4 temple-card overflow-hidden hover:temple-card-hover group"
          >
            <div className="aspect-[16/10] sm:aspect-auto overflow-hidden bg-muted">
              {today.hero_image && <img src={today.hero_image} alt={today.name} className="size-full object-cover group-hover:scale-105 transition duration-500" />}
            </div>
            <div className="p-6 flex flex-col justify-center">
              <div className="text-sm text-primary">{today.deity}</div>
              <h3 className="font-display text-3xl font-bold mt-1">{today.name}</h3>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="size-3" />{today.city}, {today.state}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-primary font-medium text-sm">Read story <ArrowRight className="size-4" /></div>
            </div>
          </Link>
        </section>
      )}

      {/* FEATURED GRID */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Curated for Sanjai</div>
            <h2 className="font-display text-2xl font-bold">Sacred places to discover</h2>
          </div>
          <Link to="/explore" className="text-sm text-primary font-medium">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {temples?.slice(0, 8).map((t) => <TempleCard key={t.slug} t={t} />)}
        </div>
      </section>
    </div>
  );
}

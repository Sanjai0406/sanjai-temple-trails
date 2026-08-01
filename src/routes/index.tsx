import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Compass, MessageCircle, MapPin, Heart, CheckCircle2, Sun, Calendar, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-temple.jpg";
import { supabase } from "@/integrations/supabase/client";
import { featuredTemples, monthPicks } from "@/lib/temples.functions";
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

const MONTH_LABEL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SEASON_ICON = ["❄️","❄️","🌸","🌸","☀️","🌧️","🌧️","🌧️","🍃","🍂","🪔","🪔"];

function HomePage() {
  const { data: temples } = useQuery({ queryKey: ["featured"], queryFn: () => featuredTemples() });
  const month = new Date().getMonth();
  const { data: monthly } = useQuery({
    queryKey: ["monthPicks", month],
    queryFn: () => monthPicks({ data: { month, limit: 12 } }),
  });
  const [name, setName] = useState("Sanjai");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.full_name?.split(" ")[0] ?? "Sanjai";
      setName(n);
    });
  }, []);

  const today = temples?.[0];
  const diyas = useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 7 + 5) % 95}%`,
    delay: `${(i * 0.8) % 12}s`,
    duration: `${10 + (i % 5) * 2}s`,
    size: 4 + (i % 4),
  })), []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Temple at dawn" width={1920} height={1280} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-temple/40 via-temple/60 to-background" />
          {/* Floating diyas */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {diyas.map((d, i) => (
              <span
                key={i}
                className="diya"
                style={{ left: d.left, width: d.size, height: d.size, animationDelay: d.delay, animationDuration: d.duration }}
              />
            ))}
          </div>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-24 sm:pt-24 sm:pb-32 text-primary-foreground animate-fade-up">
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

      {/* PERFECT FOR THIS MONTH — horizontal season-aware rail */}
      {mounted && monthly && monthly.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 mt-14">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary font-semibold">
                <Sparkles className="size-3.5" /> Perfect this {MONTH_LABEL[month]}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
                <span className="mr-2">{SEASON_ICON[month]}</span>
                Where the weather blesses your journey
              </h2>
              <p className="text-sm text-muted-foreground">Handpicked by season — hills in summer, waterfalls in monsoon, temples in winter.</p>
            </div>
            <Link to="/explore" className="hidden sm:inline text-sm text-primary font-medium">View all →</Link>
          </div>
          <div className="relative -mx-4 px-4">
            <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth stagger">
              {monthly.map((t) => (
                <Link
                  key={t.slug}
                  to="/temple/$slug"
                  params={{ slug: t.slug }}
                  className="snap-start shrink-0 w-64 sm:w-72 temple-card overflow-hidden hover:temple-card-hover group"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    {t.hero_image && (
                      <img
                        src={t.hero_image}
                        alt={t.name}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-gold/90 text-temple font-semibold">
                      {t.best_time ?? MONTH_LABEL[month]}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="font-display font-semibold text-lg leading-tight line-clamp-1">{t.name}</div>
                      <div className="text-xs opacity-90 flex items-center gap-1"><MapPin className="size-3" />{t.city}, {t.state}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED GRID */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Curated for {name}</div>
            <h2 className="font-display text-2xl font-bold">Sacred places to discover</h2>
          </div>
          <Link to="/explore" className="text-sm text-primary font-medium">View all →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
          {temples?.slice(0, 8).map((t) => <TempleCard key={t.slug} t={t} showRepairLog />)}
        </div>
      </section>

      {/* MARQUEE FOOTER TAGLINE */}
      <section className="mt-16 py-8 border-t border-border overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap animate-marquee text-2xl sm:text-3xl font-display font-semibold text-muted-foreground/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-12 shrink-0">
              <span>🕉️ Temples of Bharat</span>
              <span>🪔 Ancient wisdom</span>
              <span>⛰️ Sacred mountains</span>
              <span>💧 Holy rivers</span>
              <span>🌺 Divine journeys</span>
              <span>🦚 Tamil heritage</span>
              <span>🏛️ UNESCO wonders</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

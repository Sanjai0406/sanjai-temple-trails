import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { generateItinerary, saveItinerary, type GeneratedItinerary } from "@/lib/trips.functions";
import { getProfile } from "@/lib/profile.functions";
import { VISITED_SEED, BUDGET_BANDS, SEASONS, CATEGORIES, REGIONS } from "@/lib/constants";
import { Sparkles, Loader2, IndianRupee, Save, MapPin, X, CloudRain, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTripForecast } from "@/lib/weather.functions";
import { DayWeather } from "@/components/DayWeather";
import { adjustDayForWeather, type AdjustedDay } from "@/lib/weather-adjust";
import { downloadItineraryPdf } from "@/lib/itinerary-pdf";



type PlannerSearch = {
  stop?: string;
  stopCity?: string;
  stopState?: string;
  budget?: string;
  season?: string;
  category?: string;
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/planner")({
  validateSearch: (s: Record<string, unknown>): PlannerSearch => ({
    stop: str(s.stop),
    stopCity: str(s.stopCity),
    stopState: str(s.stopState),
    budget: str(s.budget),
    season: str(s.season),
    category: str(s.category),
  }),
  head: () => ({ meta: [{ title: "AI Trip Planner · Sanjai's Travel AI" }, { name: "description", content: "Plan a personalized temple trip with AI." }] }),
  component: Planner,
});

const INTERESTS = ["Temples", "Hidden gems", "Hill stations", "Waterfalls", "Beaches", "Heritage", "Food", "Photography"];

const regionOf = (state?: string) =>
  REGIONS.find((r) => r.id !== "all" && (r.states as readonly string[]).includes(state ?? ""))?.id ?? null;

/** Rough trip length: same state = weekend, same region = 3 days, far away = 5 days. */
function estimateDays(homeState?: string | null, stopState?: string | null) {
  if (!stopState) return 2;
  if (homeState && stopState.toLowerCase() === homeState.toLowerCase()) return 2;
  const a = regionOf(homeState ?? undefined);
  const b = regionOf(stopState);
  if (a && b && a === b) return 3;
  return 5;
}

function Planner() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const band = BUDGET_BANDS.find((b) => b.id === search.budget);
  const seasonDef = SEASONS.find((s) => s.id === search.season && s.id !== "any");
  const categoryDef = CATEGORIES.find((c) => c.id === search.category && c.id !== "all");

  const stopLabel = search.stop
    ? [search.stop, search.stopCity, search.stopState].filter(Boolean).join(", ")
    : null;

  const [days, setDays] = useState(2);
  const [budget, setBudget] = useState(band?.max ?? band?.min ?? 5000);
  const [travelMode, setTravelMode] = useState("car");
  const [start, setStart] = useState("Chennai");
  const [interests, setInterests] = useState<string[]>(
    categoryDef ? ["Temples", "Hidden gems", categoryDef.label] : ["Temples", "Hidden gems"],
  );
  const [food, setFood] = useState("vegetarian");
  const [walking, setWalking] = useState("moderate");
  const [plan, setPlan] = useState<GeneratedItinerary | null>(null);
  const [adaptToWeather, setAdaptToWeather] = useState(true);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  // Per-day date overrides (day number -> ISO date); cleared when the start date changes.
  const [dayDates, setDayDates] = useState<Record<number, string>>({});

  const forecastPlace = stopLabel ?? start;
  const { data: forecast } = useQuery({
    queryKey: ["trip-forecast", forecastPlace, startDate],
    queryFn: () => getTripForecast({ data: { place: forecastPlace, days: 10, startDate } }),
    enabled: !!plan && !!forecastPlace,
    staleTime: 30 * 60 * 1000,
  });

  const dateForDay = (day: number) => {
    if (dayDates[day]) return dayDates[day];
    const d = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return undefined;
    d.setDate(d.getDate() + day - 1);
    return d.toISOString().slice(0, 10);
  };

  // Prefill from saved travel preferences (only until the user edits the form).
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile(), retry: false });
  const prefilled = useRef(false);
  useEffect(() => {
    if (!profile || prefilled.current) return;
    prefilled.current = true;
    const p = profile as Record<string, unknown>;
    if (typeof p.preferred_travel_mode === "string") setTravelMode(p.preferred_travel_mode);
    if (typeof p.food_preference === "string") setFood(p.food_preference);
    if (typeof p.walking_difficulty === "string") setWalking(p.walking_difficulty);
    if (typeof p.home_city === "string" && p.home_city) setStart(p.home_city);
    const d = estimateDays(typeof p.home_state === "string" ? p.home_state : null, search.stopState);
    setDays(d);
    if (!band && typeof p.daily_budget === "number" && p.daily_budget > 0) setBudget(p.daily_budget * d);
  }, [profile, search.stopState, band]);

  const clearStop = () => navigate({ search: () => ({}) as PlannerSearch });



  const gen = useMutation({
    mutationFn: () => generateItinerary({
      data: {
        days, budget, travel_mode: travelMode, start_city: start, interests,
        food_preference: food, walking_difficulty: walking, avoid: VISITED_SEED,
        focus_place: stopLabel ?? undefined,
        season: seasonDef?.label,
      },
    }),
    onSuccess: (p) => { setPlan(p); toast.success("Your itinerary is ready 🛕"); },
    onError: (e: Error) => toast.error(e.message),
  });


  const save = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Please sign in to save");
      return saveItinerary({ data: { title: plan!.title, days, budget, travel_mode: travelMode, start_city: start, interests, plan: plan! } });
    },
    onSuccess: () => toast.success("Itinerary saved to your trips"),
    onError: (e: Error) => toast.error(e.message),
  });

  const exportPdf = () => {
    if (!plan) return;
    try {
      downloadItineraryPdf(
        plan,
        plan.days.map((d) => {
          const date = dateForDay(d.day);
          const f = forecast?.days?.find((x) => x.date === date);
          return { day: d, date, forecast: f, adjusted: adaptToWeather ? adjustDayForWeather(d, f) : undefined };
        }),
        { startCity: start, travelMode },
      );
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create PDF");
    }
  };



  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">AI Trip Planner</h1>
        <p className="text-sm text-muted-foreground">Tell me what you want, Sanjai — I'll craft a perfect itinerary.</p>
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-6">
        <div className="temple-card p-5 space-y-4 h-fit lg:sticky lg:top-20">
          {stopLabel && (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-medium text-primary uppercase tracking-wide">Next stop</div>
                  <div className="text-sm font-semibold leading-tight mt-0.5 inline-flex items-center gap-1">
                    <MapPin className="size-3.5 text-primary" /> {stopLabel}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {[seasonDef?.label, band?.label, categoryDef?.label].filter(Boolean).join(" · ") || "Using your Explore filters"}
                  </div>
                </div>
                <button onClick={clearStop} aria-label="Clear next stop" className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          <Field label="Starting city">
            <input value={start} onChange={(e) => setStart(e.target.value)} className="input" />
          </Field>
          <Field label="Trip start date">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
          </Field>
          <Field label={`Days: ${days}`}>
            <input type="range" min={1} max={10} value={days} onChange={(e) => setDays(+e.target.value)} className="w-full accent-primary" />
          </Field>
          <Field label="Budget (₹)">
            <div className="relative">
              <IndianRupee className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} className="input pl-9" />
            </div>
          </Field>
          <Field label="Travel mode">
            <select value={travelMode} onChange={(e) => setTravelMode(e.target.value)} className="input">
              {["car","bike","train","bus","flight"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Food">
            <select value={food} onChange={(e) => setFood(e.target.value)} className="input">
              <option value="vegetarian">Vegetarian</option>
              <option value="non-vegetarian">Non-vegetarian</option>
              <option value="jain">Jain / sattvic</option>
            </select>
          </Field>
          <Field label="Walking">
            <select value={walking} onChange={(e) => setWalking(e.target.value)} className="input">
              <option value="easy">Easy</option><option value="moderate">Moderate</option><option value="long">Long treks ok</option>
            </select>
          </Field>
          <Field label="Interests">
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button key={i} type="button" onClick={() => setInterests(on ? interests.filter((x) => x !== i) : [...interests, i])}
                    className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>
                    {i}
                  </button>
                );
              })}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={adaptToWeather} onChange={(e) => setAdaptToWeather(e.target.checked)} className="accent-primary size-4" />
            Auto-adjust each day to the forecast
          </label>
          <button
            disabled={gen.isPending}
            onClick={() => gen.mutate()}
            className="w-full h-11 rounded-xl gradient-hero text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {gen.isPending ? "Crafting…" : "Generate itinerary"}
          </button>
        </div>

        <div>
          {gen.isPending ? (
            <div className="temple-card p-12 text-center">
              <Loader2 className="size-8 animate-spin mx-auto text-primary" />
              <div className="mt-3 font-display text-lg">Consulting the temples…</div>
              <div className="text-sm text-muted-foreground">Crafting a route just for you, Sanjai.</div>
            </div>
          ) : plan ? (
            <div className="space-y-4">
              <div className="temple-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold">{plan.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{plan.summary}</p>
                    <div className="text-sm mt-2">Estimated total: <span className="font-semibold">₹{plan.total_cost?.toLocaleString("en-IN")}</span></div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={exportPdf} className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm inline-flex items-center gap-1">
                      <FileDown className="size-4" /> PDF
                    </button>
                    <button onClick={() => save.mutate()} disabled={save.isPending} className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm inline-flex items-center gap-1">
                      <Save className="size-4" /> Save
                    </button>
                  </div>
                </div>
              </div>

              {plan.days.map((d) => {
                const f = forecast?.days?.find((x) => x.date === dateForDay(d.day));
                const adj: AdjustedDay = adaptToWeather ? adjustDayForWeather(d, f) : { values: {}, changes: [] };
                const val = (k: keyof typeof d) => (adj.values[k] as string | undefined) ?? (d[k] as string | undefined);
                const orig = (k: keyof typeof d) => (adj.values[k] ? (d[k] as string | undefined) : undefined);
                return (
                <div key={d.day} className="temple-card p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Day {d.day} · {d.title}</h3>
                    {d.estimated_cost != null && <div className="text-sm text-muted-foreground">₹{d.estimated_cost.toLocaleString("en-IN")}</div>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <DayWeather
                      date={dateForDay(d.day)}
                      forecast={f}
                      seasonLabel={seasonDef?.label}
                    />
                    <label className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="sr-only">Date for day {d.day}</span>
                      <input
                        type="date"
                        value={dateForDay(d.day) ?? ""}
                        onChange={(e) => setDayDates((m) => ({ ...m, [d.day]: e.target.value }))}
                        className="input h-8 py-0 text-xs w-[9.5rem]"
                      />
                      {dayDates[d.day] && (
                        <button
                          type="button"
                          onClick={() => setDayDates(({ [d.day]: _, ...rest }) => rest)}
                          className="underline hover:text-foreground"
                        >
                          reset
                        </button>
                      )}
                    </label>
                  </div>

                  {adaptToWeather && adj.headline && (
                    <div className={`mt-2 rounded-xl border p-3 text-xs ${adj.changes.length ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
                      <div className="font-semibold text-foreground inline-flex items-center gap-1.5">
                        <CloudRain className="size-3.5 text-primary" /> {adj.headline}
                      </div>
                      {adj.changes.length > 0 && (
                        <ul className="mt-1.5 space-y-1 text-muted-foreground">
                          {adj.changes.map((c, i) => (
                            <li key={i}>
                              <span className="text-foreground font-medium">{c.label}</span> adjusted — {c.reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <ul className="mt-3 space-y-2 text-sm">
                    {val("morning") && <Row k="🌅 Morning" v={val("morning")!} was={orig("morning")} />}
                    {d.breakfast && <Row k="🍽️ Breakfast" v={d.breakfast} />}
                    {val("temple") && <Row k="🛕 Temple" v={val("temple")!} was={orig("temple")} />}
                    {d.nearby && <Row k="📿 Nearby" v={d.nearby} />}
                    {d.lunch && <Row k="🍛 Lunch" v={d.lunch} />}
                    {val("scenic") && <Row k="🌳 Afternoon" v={val("scenic")!} was={orig("scenic")} />}
                    {val("sunset") && <Row k="🌇 Sunset" v={val("sunset")!} was={orig("sunset")} />}
                    {d.dinner && <Row k="🌙 Dinner" v={d.dinner} />}
                    {d.return_home && <Row k="🏠 Return" v={d.return_home} />}
                    {val("notes") && <Row k="💡 Notes" v={val("notes")!} was={orig("notes")} />}
                  </ul>
                </div>
                );
              })}


              <div className="grid md:grid-cols-2 gap-4">
                <ListCard title="Travel tips" items={plan.travel_tips} />
                <ListCard title="Packing list" items={plan.packing_list} />
              </div>
            </div>
          ) : (
            <div className="temple-card p-12 text-center text-muted-foreground">
              <Sparkles className="size-8 mx-auto text-primary" />
              <div className="mt-3 font-display text-lg text-foreground">Ready when you are</div>
              <div className="text-sm">Fill the form and tap "Generate itinerary".</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
function Row({ k, v, was }: { k: string; v: string; was?: string }) {
  return (
    <li className="flex gap-2">
      <span className="shrink-0 text-muted-foreground w-28">{k}</span>
      <span className="flex-1">
        {v}
        {was && (
          <span className="block text-xs text-muted-foreground line-through mt-0.5">{was}</span>
        )}
      </span>
    </li>
  );
}
function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="temple-card p-5">
      <h4 className="font-display text-lg font-semibold mb-2">{title}</h4>
      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
        {items?.map((i, idx) => <li key={idx}>{i}</li>)}
      </ul>
    </div>
  );
}

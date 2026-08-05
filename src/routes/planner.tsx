import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { generateItinerary, saveItinerary, type GeneratedItinerary } from "@/lib/trips.functions";
import { VISITED_SEED, BUDGET_BANDS, SEASONS, CATEGORIES } from "@/lib/constants";
import { Sparkles, Loader2, IndianRupee, Save, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
                  <button onClick={() => save.mutate()} disabled={save.isPending} className="px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-sm inline-flex items-center gap-1">
                    <Save className="size-4" /> Save
                  </button>
                </div>
              </div>

              {plan.days.map((d) => (
                <div key={d.day} className="temple-card p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl font-bold">Day {d.day} · {d.title}</h3>
                    {d.estimated_cost != null && <div className="text-sm text-muted-foreground">₹{d.estimated_cost.toLocaleString("en-IN")}</div>}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {d.morning && <Row k="🌅 Morning" v={d.morning} />}
                    {d.breakfast && <Row k="🍽️ Breakfast" v={d.breakfast} />}
                    {d.temple && <Row k="🛕 Temple" v={d.temple} />}
                    {d.nearby && <Row k="📿 Nearby" v={d.nearby} />}
                    {d.lunch && <Row k="🍛 Lunch" v={d.lunch} />}
                    {d.scenic && <Row k="🌳 Afternoon" v={d.scenic} />}
                    {d.sunset && <Row k="🌇 Sunset" v={d.sunset} />}
                    {d.dinner && <Row k="🌙 Dinner" v={d.dinner} />}
                    {d.return_home && <Row k="🏠 Return" v={d.return_home} />}
                    {d.notes && <Row k="💡 Notes" v={d.notes} />}
                  </ul>
                </div>
              ))}

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
function Row({ k, v }: { k: string; v: string }) {
  return <li className="flex gap-2"><span className="shrink-0 text-muted-foreground w-28">{k}</span><span className="flex-1">{v}</span></li>;
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

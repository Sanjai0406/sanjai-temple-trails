import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { listTemples, placeFilterOptions } from "@/lib/temples.functions";
import { TempleCard } from "@/components/TempleCard";
import { CATEGORIES, REGIONS, SEASONS, BUDGET_BANDS } from "@/lib/constants";
import { Search as SearchIcon, SlidersHorizontal, X, Gem, Map as MapIcon, LayoutGrid } from "lucide-react";

const ExploreMap = lazy(() =>
  import("@/components/ExploreMap").then((m) => ({ default: m.ExploreMap })),
);

type SearchParams = {
  q?: string;
  category?: string;
  state?: string;
  region?: string;
  season?: string;
  budget?: string;
  hidden?: boolean;
  sort?: string;
  view?: "map" | "grid";
};

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: str(s.q),
    category: str(s.category),
    state: str(s.state),
    region: str(s.region),
    season: str(s.season),
    budget: str(s.budget),
    hidden: s.hidden === true || s.hidden === "true" ? true : undefined,
    sort: str(s.sort),
  }),
  head: () => ({
    meta: [
      { title: "Explore underrated spots · Sanjai's Travel AI" },
      { name: "description", content: "Search and filter temples, hills, waterfalls and hidden gems by region, best season and budget." },
      { property: "og:title", content: "Explore underrated spots · Sanjai's Travel AI" },
      { property: "og:description", content: "Filter 100+ sacred and offbeat destinations by region, best season and budget." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [q, setQ] = useState(search.q ?? "");
  const cat = search.category ?? "all";
  const region = search.region ?? "all";
  const state = search.state ?? "";
  const season = search.season ?? "any";
  const budget = search.budget ?? "any";
  const hiddenOnly = search.hidden === true;
  const sort = (search.sort ?? "rating") as "rating" | "budget_asc" | "budget_desc" | "name";

  const set = (patch: Partial<SearchParams>) =>
    navigate({ search: (s: SearchParams) => ({ ...s, ...patch }) });

  const { data: options } = useQuery({ queryKey: ["filter-options"], queryFn: () => placeFilterOptions() });

  const regionDef = REGIONS.find((r) => r.id === region) ?? REGIONS[0];
  const seasonDef = SEASONS.find((s) => s.id === season) ?? SEASONS[0];
  const bandDef = BUDGET_BANDS.find((b) => b.id === budget) ?? BUDGET_BANDS[0];

  const statesInRegion = useMemo(() => {
    const all = options?.states ?? [];
    if (!regionDef.states.length) return all;
    return all.filter((s) => (regionDef.states as readonly string[]).includes(s));
  }, [options?.states, regionDef]);

  const filters = {
    category: cat,
    q: q || undefined,
    state: state || undefined,
    states: !state && regionDef.states.length ? statesInRegion : undefined,
    months: seasonDef.months.length ? [...seasonDef.months] : undefined,
    budgetMin: bandDef.min,
    budgetMax: bandDef.max,
    hiddenOnly: hiddenOnly || undefined,
    sort,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["temples", filters],
    queryFn: () => listTemples({ data: filters }),
  });

  const results = data ?? [];
  const activeCount =
    (cat !== "all" ? 1 : 0) + (region !== "all" ? 1 : 0) + (state ? 1 : 0) +
    (season !== "any" ? 1 : 0) + (budget !== "any" ? 1 : 0) + (hiddenOnly ? 1 : 0);

  const clearAll = () => {
    setQ("");
    navigate({ search: () => ({}) as SearchParams });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Explore</h1>
        <p className="text-sm text-muted-foreground">
          Temples, hills, waterfalls and heritage across Tamil Nadu and India — filter by region, best season and budget.
        </p>
      </div>

      <div className="glass rounded-2xl p-3 sticky top-16 z-30 mb-4">
        {/* Row 1 — search + region + state */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3 border border-border">
            <SearchIcon className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); set({ q: e.target.value || undefined }); }}
              placeholder="Search name, city, deity, speciality…"
              className="flex-1 h-10 bg-transparent outline-none text-sm"
            />
            {q && (
              <button onClick={() => { setQ(""); set({ q: undefined }); }} aria-label="Clear search">
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <select
            value={region}
            onChange={(e) => set({ region: e.target.value === "all" ? undefined : e.target.value, state: undefined })}
            className="h-10 rounded-xl bg-card border border-border px-3 text-sm"
            aria-label="Region"
          >
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <select
            value={state}
            onChange={(e) => set({ state: e.target.value || undefined })}
            className="h-10 rounded-xl bg-card border border-border px-3 text-sm"
            aria-label="State"
          >
            <option value="">All states{regionDef.id !== "all" ? ` in ${regionDef.label}` : ""}</option>
            {statesInRegion.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Row 2 — season + budget + hidden gems + sort */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <SlidersHorizontal className="size-3.5" /> Filters
          </span>
          <select
            value={season}
            onChange={(e) => set({ season: e.target.value === "any" ? undefined : e.target.value })}
            className="h-9 rounded-xl bg-card border border-border px-3 text-sm"
            aria-label="Best season"
          >
            {SEASONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select
            value={budget}
            onChange={(e) => set({ budget: e.target.value === "any" ? undefined : e.target.value })}
            className="h-9 rounded-xl bg-card border border-border px-3 text-sm"
            aria-label="Budget"
          >
            {BUDGET_BANDS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <button
            onClick={() => set({ hidden: hiddenOnly ? undefined : true })}
            className={`h-9 px-3 rounded-xl text-sm font-medium border inline-flex items-center gap-1.5 transition ${
              hiddenOnly ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
            }`}
          >
            <Gem className="size-3.5" /> Underrated only
          </button>
          <select
            value={sort}
            onChange={(e) => set({ sort: e.target.value === "rating" ? undefined : e.target.value })}
            className="h-9 rounded-xl bg-card border border-border px-3 text-sm ml-auto"
            aria-label="Sort"
          >
            <option value="rating">Top rated</option>
            <option value="budget_asc">Budget: low to high</option>
            <option value="budget_desc">Budget: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {/* Row 3 — categories */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => set({ category: c.id === "all" ? undefined : c.id })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                cat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
              }`}
            >
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
        <div>
          {isLoading ? "Searching…" : `${results.length} place${results.length === 1 ? "" : "s"}`}
          {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} active`}
          {options ? ` · ${options.total} in catalog` : ""}
        </div>
        {(activeCount > 0 || q) && (
          <button onClick={clearAll} className="text-primary font-medium inline-flex items-center gap-1">
            <X className="size-3.5" /> Clear all
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-muted-foreground">No places match these filters.</div>
          <button onClick={clearAll} className="mt-3 text-primary font-medium">Reset filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.map((t) => <TempleCard key={t.slug} t={t} />)}
        </div>
      )}
    </div>
  );
}

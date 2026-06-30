import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listTemples } from "@/lib/temples.functions";
import { TempleCard } from "@/components/TempleCard";
import { CATEGORIES, TAMIL_STATES } from "@/lib/constants";
import { Search as SearchIcon } from "lucide-react";

type SearchParams = { q?: string; category?: string; state?: string };

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    category: typeof s.category === "string" ? s.category : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
  }),
  head: () => ({ meta: [{ title: "Explore · Sanjai's Travel AI" }, { name: "description", content: "Browse temples and destinations by category, state and more." }] }),
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [cat, setCat] = useState(search.category ?? "all");
  const [state, setState] = useState(search.state ?? "");

  const { data, isLoading } = useQuery({
    queryKey: ["temples", cat, state, q],
    queryFn: () => listTemples({ data: { category: cat, state: state || undefined, q: q || undefined } }),
  });

  const filtered = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold">Explore</h1>
        <p className="text-sm text-muted-foreground">Temples, hills, waterfalls and heritage across Tamil Nadu and India.</p>
      </div>

      <div className="glass rounded-2xl p-3 sticky top-16 z-30 mb-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3 border border-border">
            <SearchIcon className="size-4 text-muted-foreground" />
            <input
              value={q} onChange={(e) => { setQ(e.target.value); navigate({ search: (s: SearchParams) => ({ ...s, q: e.target.value || undefined }) }); }}
              placeholder="Search by name, city, deity…"
              className="flex-1 h-10 bg-transparent outline-none text-sm"
            />
          </div>
          <select
            value={state} onChange={(e) => { setState(e.target.value); navigate({ search: (s: SearchParams) => ({ ...s, state: e.target.value || undefined }) }); }}
            className="h-10 rounded-xl bg-card border border-border px-3 text-sm"
          >
            <option value="">All states</option>
            {TAMIL_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCat(c.id); navigate({ search: (s: SearchParams) => ({ ...s, category: c.id === "all" ? undefined : c.id }) }); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                cat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
              }`}
            >
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">No places found. Try a different filter.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((t) => <TempleCard key={t.slug} t={t} />)}
        </div>
      )}
    </div>
  );
}

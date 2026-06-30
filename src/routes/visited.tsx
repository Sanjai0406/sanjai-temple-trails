import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVisited, addVisited, removeVisited } from "@/lib/profile.functions";
import { CheckCircle2, Trash2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/visited")({
  head: () => ({ meta: [{ title: "Visited Places · Sanjai's Travel AI" }] }),
  component: VisitedPage,
});

function VisitedPage() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [stateName, setStateName] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user)); }, []);

  const { data, isLoading } = useQuery({ queryKey: ["visited"], queryFn: () => getVisited(), enabled: !!authed });
  const add = useMutation({
    mutationFn: () => addVisited({ data: { place_name: name, place_state: stateName, rating } }),
    onSuccess: () => { toast.success("Added"); setName(""); setStateName(""); qc.invalidateQueries({ queryKey: ["visited"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => removeVisited({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["visited"] }); },
  });

  if (authed === false)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Visited Places</h1>
        <p className="text-sm text-muted-foreground mt-2">Sign in to keep your travel log.</p>
        <Link to="/auth" className="mt-4 inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-medium">Sign in</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><CheckCircle2 className="size-7 text-primary" /> Visited Places</h1>
      <p className="text-sm text-muted-foreground">Your spiritual journey log.</p>

      <div className="temple-card p-4 mt-4 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Place name" className="input" />
        <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" className="input" />
        <select value={rating} onChange={(e) => setRating(+e.target.value)} className="input">
          {[5,4,3,2,1].map((r) => <option key={r} value={r}>{r} ★</option>)}
        </select>
        <button onClick={() => name && add.mutate()} disabled={!name || add.isPending} className="h-10 px-4 rounded-xl gradient-hero text-primary-foreground text-sm inline-flex items-center gap-1 disabled:opacity-50">
          <Plus className="size-4" /> Add
        </button>
      </div>

      {isLoading ? <div className="mt-6 h-40 animate-pulse bg-muted rounded-xl" /> :
       !data?.length ? <div className="mt-12 text-center text-muted-foreground">No visits logged yet.</div> : (
        <div className="mt-6 grid gap-2">
          {data.map((v: any) => (
            <div key={v.id} className="temple-card p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">{v.place_name}</div>
                <div className="text-xs text-muted-foreground">{v.place_state} · {new Date(v.created_at).toLocaleDateString("en-IN")}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5 text-xs">
                  {Array.from({ length: v.rating ?? 0 }).map((_, i) => <Star key={i} className="size-3 fill-gold text-gold" />)}
                </div>
                <button onClick={() => del.mutate(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

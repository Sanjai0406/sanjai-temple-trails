import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, getTravelStats } from "@/lib/profile.functions";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, MapPin, Heart, CheckCircle2, Compass, Sparkles } from "lucide-react";
import { useMotionIntensity, type MotionIntensity } from "@/lib/motion";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile · Sanjai's Travel AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setAuthed(!!data.user); setEmail(data.user?.email ?? ""); });
  }, []);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile(), enabled: !!authed });
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => getTravelStats(), enabled: !!authed });

  const [form, setForm] = useState({
    display_name: "", home_city: "Chennai", home_state: "Tamil Nadu",
    preferred_travel_mode: "car", daily_budget: 2000, walking_difficulty: "moderate", food_preference: "vegetarian",
  });
  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, ...Object.fromEntries(Object.entries(profile).filter(([, v]) => v != null)) }));
  }, [profile]);

  const save = useMutation({
    mutationFn: () => updateProfile({ data: form }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (authed === false)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-2">Sign in to set your travel preferences.</p>
        <Link to="/auth" className="mt-4 inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-medium">Sign in</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="size-16 rounded-2xl gradient-gold grid place-items-center text-temple font-display text-2xl font-bold">
          {(form.display_name?.[0] ?? "S").toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">{form.display_name || "Sanjai"}</h1>
          <div className="text-sm text-muted-foreground">{email}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CheckCircle2} label="Visited" value={stats?.visitedCount ?? 0} />
        <StatCard icon={MapPin} label="States" value={stats?.statesCount ?? 0} />
        <StatCard icon={Heart} label="Wishlist" value={stats?.wishlistCount ?? 0} />
        <StatCard icon={Compass} label="Trips" value={stats?.tripsCount ?? 0} />
      </div>

      <div className="temple-card p-5 space-y-4">
        <h2 className="font-display text-lg font-semibold">Travel preferences</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Display name"><input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></Field>
          <Field label="Home city"><input className="input" value={form.home_city} onChange={(e) => setForm({ ...form, home_city: e.target.value })} /></Field>
          <Field label="Home state"><input className="input" value={form.home_state} onChange={(e) => setForm({ ...form, home_state: e.target.value })} /></Field>
          <Field label="Daily budget (₹)"><input type="number" className="input" value={form.daily_budget} onChange={(e) => setForm({ ...form, daily_budget: +e.target.value })} /></Field>
          <Field label="Preferred travel mode">
            <select className="input" value={form.preferred_travel_mode} onChange={(e) => setForm({ ...form, preferred_travel_mode: e.target.value })}>
              {["car","bike","train","bus","flight"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Walking difficulty">
            <select className="input" value={form.walking_difficulty} onChange={(e) => setForm({ ...form, walking_difficulty: e.target.value })}>
              <option value="easy">Easy</option><option value="moderate">Moderate</option><option value="long">Long treks ok</option>
            </select>
          </Field>
          <Field label="Food">
            <select className="input" value={form.food_preference} onChange={(e) => setForm({ ...form, food_preference: e.target.value })}>
              <option value="vegetarian">Vegetarian</option><option value="non-vegetarian">Non-vegetarian</option><option value="jain">Jain / sattvic</option>
            </select>
          </Field>
        </div>
        <button onClick={() => save.mutate()} disabled={save.isPending} className="h-11 px-5 rounded-xl gradient-hero text-primary-foreground font-semibold disabled:opacity-50">Save preferences</button>
      </div>

      <MotionSettings />
    </div>
  );
}

function MotionSettings() {
  const [intensity, setIntensity] = useMotionIntensity();
  const options: { value: MotionIntensity; label: string; hint: string }[] = [
    { value: "standard", label: "Standard", hint: "Floating diyas, shimmer, marquee" },
    { value: "low", label: "Low", hint: "Only essential fades, no ambient loops" },
  ];
  return (
    <div className="temple-card p-5 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Animation intensity</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        System <em>prefers-reduced-motion</em> is always respected and overrides this setting.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((o) => {
          const active = intensity === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setIntensity(o.value)}
              className={`text-left p-3 rounded-xl border transition ${
                active ? "border-primary bg-accent/60" : "border-border hover:bg-accent/30"
              }`}
              aria-pressed={active}
            >
              <div className="text-sm font-semibold">{o.label}</div>
              <div className="text-xs text-muted-foreground">{o.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof User; label: string; value: number }) {
  return (
    <div className="temple-card p-4">
      <Icon className="size-5 text-primary" />
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>{children}</label>;
}

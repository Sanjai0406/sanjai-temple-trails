import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Compass, MessageCircle, MapPin, Heart, CheckCircle2, User, Sparkles, Menu, X } from "lucide-react";
import { applyMotionIntensity, readMotionIntensity } from "@/lib/motion";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/planner", label: "Planner", icon: MapPin },
  { to: "/chat", label: "AI Chat", icon: MessageCircle },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/visited", label: "Visited", icon: CheckCircle2 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyMotionIntensity(readMotionIntensity());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthed(!!data.user);
      setName(data.user?.user_metadata?.full_name ?? data.user?.email?.split("@")[0] ?? "");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setAuthed(!!sess?.user);
      setName(sess?.user?.user_metadata?.full_name ?? sess?.user?.email?.split("@")[0] ?? "");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="size-9 rounded-xl gradient-hero grid place-items-center shadow-[var(--shadow-glow)]">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold">Sanjai's Travel AI</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Temple Explorer · 🇮🇳</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.to || (n.to !== "/" && pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {authed ? (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="size-8 rounded-full gradient-gold grid place-items-center text-xs font-semibold text-temple">
                  {(name?.[0] ?? "S").toUpperCase()}
                </div>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.navigate({ to: "/" });
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="text-sm font-medium px-3 py-1.5 rounded-lg gradient-hero text-primary-foreground shadow-[var(--shadow-soft)]"
              >
                Sign in
              </Link>
            )}
            <button onClick={() => setOpen((o) => !o)} className="lg:hidden p-2 rounded-lg hover:bg-accent">
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="lg:hidden border-t border-border px-4 py-3 grid grid-cols-2 gap-2 bg-card">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm"
              >
                <n.icon className="size-4 text-primary" />
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border mt-12">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <div>Vanakkam Sanjai 🙏 — Discover the temples & soul of Bharat.</div>
          <div>Powered by Lovable Cloud · Google Maps · Gemini</div>
        </div>
      </footer>
    </div>
  );
}

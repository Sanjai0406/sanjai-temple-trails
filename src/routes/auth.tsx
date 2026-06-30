import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Sanjai's Travel AI" },
      { name: "description", content: "Sign in with Google, email or continue as guest." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/" }); });
  }, [navigate]);

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (res.redirected) return;
    navigate({ to: "/" });
  };

  const emailAuth = async () => {
    if (!email || !password) return toast.error("Email and password required");
    setBusy(true);
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    const { error } = await fn;
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "signin" ? "Welcome back, Sanjai 🙏" : "Account created!");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md temple-card p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="size-10 rounded-xl gradient-hero grid place-items-center"><Sparkles className="size-5 text-primary-foreground" /></div>
          <div>
            <div className="font-display text-xl font-semibold">Welcome, Sanjai 🙏</div>
            <div className="text-xs text-muted-foreground">Sign in to save your journey</div>
          </div>
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="w-full h-11 rounded-xl border border-border bg-card hover:bg-accent transition flex items-center justify-center gap-2 font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full h-11 rounded-xl bg-input/40 border border-border px-3 outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full h-11 rounded-xl bg-input/40 border border-border px-3 outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={emailAuth} disabled={busy}
            className="w-full h-11 rounded-xl gradient-hero text-primary-foreground font-semibold disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Continue as guest →</Link>
        </div>
      </div>
    </div>
  );
}

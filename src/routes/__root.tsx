import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="text-7xl font-display font-bold text-gradient-hero">404</div>
          <h2 className="mt-4 text-xl font-semibold">Path not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The temple you are looking for hasn't been mapped yet, Sanjai.
          </p>
          <Link to="/" className="mt-6 inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-medium">
            Go home
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mt-6 inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-medium"
          >Try again</button>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#c97a3a" },
      { title: "Sanjai's Travel AI · Temple Explorer" },
      { name: "description", content: "AI travel companion for Sanjai — discover famous, hidden and ancient temples, nature, hills and heritage across Tamil Nadu and India." },
      { property: "og:title", content: "Sanjai's Travel AI · Temple Explorer" },
      { property: "og:description", content: "AI travel companion for Sanjai — discover famous, hidden and ancient temples, nature, hills and heritage across Tamil Nadu and India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sanjai's Travel AI · Temple Explorer" },
      { name: "twitter:description", content: "AI travel companion for Sanjai — discover famous, hidden and ancient temples, nature, hills and heritage across Tamil Nadu and India." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc7be47-ff1e-437c-b54a-c22217a9076b/id-preview-33d87c44--f522faef-6b63-4bb8-9977-ad1c2a59ced5.lovable.app-1782839736926.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5bc7be47-ff1e-437c-b54a-c22217a9076b/id-preview-33d87c44--f522faef-6b63-4bb8-9977-ad1c2a59ced5.lovable.app-1782839736926.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell><Outlet /></AppShell>
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

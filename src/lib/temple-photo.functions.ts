import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/** Look up a photo resource `name` for a temple via Places searchText. */
async function findPhotoName(
  query: string,
  lovableKey: string,
  gmapsKey: string,
): Promise<string | null> {
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gmapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "places.photos",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { places?: Array<{ photos?: Array<{ name: string }> }> };
  return body.places?.[0]?.photos?.[0]?.name ?? null;
}

/** Turn a Places photo resource name into a fresh, direct photoUri. */
async function resolvePhotoUri(
  photoName: string,
  lovableKey: string,
  gmapsKey: string,
): Promise<string | null> {
  const res = await fetch(
    `${GATEWAY_URL}/places/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true`,
    { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmapsKey } },
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { photoUri?: string };
  return body.photoUri ?? null;
}

function serverAnonClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Authenticated manual refresh (button on the temple detail page).
 * Re-searches Google Places for the best photo and stores both the resource
 * name (stable) and a fresh photoUri (fast direct URL).
 */
async function logRepair(
  templeId: string,
  row: {
    source: "cached_ref" | "search" | "manual_refresh";
    success: boolean;
    photo_uri?: string | null;
    error_message?: string | null;
    triggered_by: "auto" | "manual";
  },
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("temple_photo_repairs").insert({
      temple_id: templeId,
      source: row.source,
      success: row.success,
      photo_uri: row.photo_uri ?? null,
      error_message: row.error_message ?? null,
      triggered_by: row.triggered_by,
    });
  } catch {
    // Logging must never break the primary repair flow.
  }
}

export const refreshTemplePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("slug required");
    return { slug: input.slug.slice(0, 120) };
  })
  .handler(async ({ data, context }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) throw new Error("Google Maps connector not configured");

    const { data: t, error } = await context.supabase
      .from("temples")
      .select("id, slug, name, city, state, deity")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Temple not found");

    const query = [t.name, t.deity, t.city, t.state].filter(Boolean).join(" ");
    try {
      const photoName = await findPhotoName(query, lovableKey, gmapsKey);
      if (!photoName) throw new Error("No photos available on Google Places for this destination");

      const uri = await resolvePhotoUri(photoName, lovableKey, gmapsKey);
      if (!uri) throw new Error("Google did not return a photo URL");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: upErr } = await supabaseAdmin
        .from("temples")
        .update({ hero_image: uri, google_photo_ref: photoName })
        .eq("id", t.id);
      if (upErr) throw new Error(upErr.message);

      await logRepair(t.id, {
        source: "manual_refresh",
        success: true,
        photo_uri: uri,
        triggered_by: "manual",
      });

      return { hero_image: uri, google_photo_ref: photoName };
    } catch (err) {
      await logRepair(t.id, {
        source: "manual_refresh",
        success: false,
        error_message: err instanceof Error ? err.message : String(err),
        triggered_by: "manual",
      });
      throw err;
    }
  });

/**
 * Public self-heal: called from `<img onError>` when a cached photoUri has
 * expired. Reuses the stored `google_photo_ref` to mint a fresh URL without
 * re-running the text search; only falls back to search when we have no ref
 * on file yet. Safe to expose anonymously — it just refreshes a public photo
 * URL for a public row.
 */
export const repairTemplePhoto = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string; triggered_by?: "auto" | "manual" }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("slug required");
    return {
      slug: input.slug.slice(0, 120),
      triggered_by: input.triggered_by === "manual" ? "manual" : "auto",
    } as const;
  })
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) throw new Error("Google Maps connector not configured");

    const sb = serverAnonClient();
    const { data: t } = await sb
      .from("temples")
      .select("id, name, city, state, deity, google_photo_ref")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!t) throw new Error("Temple not found");

    let photoName = t.google_photo_ref;
    let source: "cached_ref" | "search" = photoName ? "cached_ref" : "search";
    try {
      if (!photoName) {
        const query = [t.name, t.deity, t.city, t.state].filter(Boolean).join(" ");
        photoName = await findPhotoName(query, lovableKey, gmapsKey);
        source = "search";
      }
      if (!photoName) throw new Error("No photo available");

      const uri = await resolvePhotoUri(photoName, lovableKey, gmapsKey);
      if (!uri) throw new Error("Could not resolve photo URL");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("temples")
        .update({ hero_image: uri, google_photo_ref: photoName })
        .eq("id", t.id);

      await logRepair(t.id, {
        source,
        success: true,
        photo_uri: uri,
        triggered_by: data.triggered_by,
      });

      return { hero_image: uri };
    } catch (err) {
      await logRepair(t.id, {
        source,
        success: false,
        error_message: err instanceof Error ? err.message : String(err),
        triggered_by: data.triggered_by,
      });
      throw err;
    }
  });

/** Public: list recent photo-repair log entries for a temple. */
export const listTemplePhotoRepairs = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string; limit?: number }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("slug required");
    const limit = Math.max(1, Math.min(50, Number(input.limit) || 10));
    return { slug: input.slug.slice(0, 120), limit };
  })
  .handler(async ({ data }) => {
    const sb = serverAnonClient();
    const { data: t } = await sb
      .from("temples")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!t) return { logs: [], total: 0 };

    const { data: rows } = await sb
      .from("temple_photo_repairs")
      .select("id, created_at, source, success, photo_uri, error_message, triggered_by")
      .eq("temple_id", t.id)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const { count } = await sb
      .from("temple_photo_repairs")
      .select("id", { count: "exact", head: true })
      .eq("temple_id", t.id);

    return { logs: rows ?? [], total: count ?? (rows?.length ?? 0) };
  });


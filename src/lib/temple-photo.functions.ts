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

    return { hero_image: uri, google_photo_ref: photoName };
  });

/**
 * Public self-heal: called from `<img onError>` when a cached photoUri has
 * expired. Reuses the stored `google_photo_ref` to mint a fresh URL without
 * re-running the text search; only falls back to search when we have no ref
 * on file yet. Safe to expose anonymously — it just refreshes a public photo
 * URL for a public row.
 */
export const repairTemplePhoto = createServerFn({ method: "POST" })
  .inputValidator((input: { slug: string }) => {
    if (!input?.slug || typeof input.slug !== "string") throw new Error("slug required");
    return { slug: input.slug.slice(0, 120) };
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
    if (!photoName) {
      const query = [t.name, t.deity, t.city, t.state].filter(Boolean).join(" ");
      photoName = await findPhotoName(query, lovableKey, gmapsKey);
    }
    if (!photoName) throw new Error("No photo available");

    const uri = await resolvePhotoUri(photoName, lovableKey, gmapsKey);
    if (!uri) throw new Error("Could not resolve photo URL");

    // Persist the fresh URL (and ref, if newly discovered) so every other
    // viewer gets the healed image without hitting Google again.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("temples")
      .update({ hero_image: uri, google_photo_ref: photoName })
      .eq("id", t.id);

    return { hero_image: uri };
  });

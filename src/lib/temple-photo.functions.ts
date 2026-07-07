import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

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

    // Load temple through the user-scoped supabase (RLS: public read)
    const { data: t, error } = await context.supabase
      .from("temples")
      .select("id, slug, name, city, state, deity")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("Temple not found");

    const query = [t.name, t.deity, t.city, t.state].filter(Boolean).join(" ");

    // 1. searchText → get first place with photos
    const searchRes = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
    });
    if (!searchRes.ok) {
      const body = await searchRes.text();
      throw new Error(`Places search failed [${searchRes.status}]: ${body}`);
    }
    const searchBody = (await searchRes.json()) as {
      places?: Array<{ photos?: Array<{ name: string }> }>;
    };
    const photoName = searchBody.places?.[0]?.photos?.[0]?.name;
    if (!photoName) throw new Error("No photos available on Google Places for this destination");

    // 2. photo media (skipHttpRedirect → returns { photoUri } stable public URL)
    const mediaRes = await fetch(
      `${GATEWAY_URL}/places/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true`,
      { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmapsKey } },
    );
    if (!mediaRes.ok) {
      const body = await mediaRes.text();
      throw new Error(`Photo fetch failed [${mediaRes.status}]: ${body}`);
    }
    const mediaBody = (await mediaRes.json()) as { photoUri?: string };
    const uri = mediaBody.photoUri;
    if (!uri) throw new Error("Google did not return a photo URL");

    // 3. Update via service role (temples has no user-scoped write policy)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("temples")
      .update({ hero_image: uri })
      .eq("id", t.id);
    if (upErr) throw new Error(upErr.message);

    return { hero_image: uri };
  });

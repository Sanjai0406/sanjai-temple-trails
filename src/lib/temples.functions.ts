import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listTemples = createServerFn({ method: "GET" })
  .inputValidator((data: { category?: string; state?: string; q?: string; limit?: number } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("temples").select("*").limit(data.limit ?? 60);
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    if (data.state) q = q.eq("state", data.state);
    if (data.q) q = q.or(`name.ilike.%${data.q}%,city.ilike.%${data.q}%,deity.ilike.%${data.q}%,district.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getTemple = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb.from("temples").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const featuredTemples = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("temples")
    .select("id,slug,name,city,state,category,hero_image,rating,is_unesco,is_hidden_gem,deity")
    .order("rating", { ascending: false })
    .limit(8);
  return data ?? [];
});

const MONTH_ABBR = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const MONTH_FULL = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/** Return temples whose `best_time` covers the given 0-indexed month. */
export const monthPicks = createServerFn({ method: "GET" })
  .inputValidator((d: { month?: number; limit?: number } | undefined) => d ?? {})
  .handler(async ({ data }) => {
    const m = typeof data.month === "number" ? data.month : new Date().getUTCMonth();
    const abbr = MONTH_ABBR[m];
    const full = MONTH_FULL[m];
    const sb = publicClient();
    // Match either abbreviation ("Nov") or full name ("November") anywhere in best_time text.
    const { data: rows } = await sb
      .from("temples")
      .select("id,slug,name,city,state,category,hero_image,rating,is_unesco,is_hidden_gem,deity,best_time")
      .or(`best_time.ilike.%${abbr}%,best_time.ilike.%${full}%`)
      .limit(data.limit ?? 12);
    return rows ?? [];
  });

/** Nearby destinations by haversine distance. */
export const nearbyTemples = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: origin } = await sb
      .from("temples")
      .select("latitude,longitude")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!origin?.latitude || !origin?.longitude) return [];
    const { data: rows } = await sb
      .from("temples")
      .select("id,slug,name,city,state,category,hero_image,rating,is_unesco,is_hidden_gem,deity,latitude,longitude")
      .neq("slug", data.slug)
      .not("latitude", "is", null);
    const olat = Number(origin.latitude), olng = Number(origin.longitude);
    const withDist = (rows ?? []).map((r) => {
      const lat = Number(r.latitude), lng = Number(r.longitude);
      const R = 6371;
      const dLat = (lat - olat) * Math.PI / 180;
      const dLng = (lng - olng) * Math.PI / 180;
      const a = Math.sin(dLat/2) ** 2 + Math.cos(olat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2) ** 2;
      const km = 2 * R * Math.asin(Math.sqrt(a));
      return { ...r, distance_km: Math.round(km) };
    }).sort((a, b) => a.distance_km - b.distance_km);
    return withDist.slice(0, data.limit ?? 6);
  });

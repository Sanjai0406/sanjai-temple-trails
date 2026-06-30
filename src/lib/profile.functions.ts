import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wishlist")
      .select("*, temples(id,slug,name,city,state,hero_image,category,deity)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addToWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { temple_id?: string; custom_name?: string; custom_location?: string; note?: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("wishlist")
      .insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFromWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("wishlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVisited = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("visited_places")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addVisited = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { place_name: string; place_state?: string; visit_date?: string; rating?: number; notes?: string; temple_id?: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("visited_places").insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeVisited = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("visited_places").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    display_name?: string;
    home_city?: string;
    home_state?: string;
    preferred_travel_mode?: string;
    daily_budget?: number;
    walking_difficulty?: string;
    food_preference?: string;
  }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTravelStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [v, w, i] = await Promise.all([
      context.supabase.from("visited_places").select("place_state", { count: "exact" }),
      context.supabase.from("wishlist").select("id", { count: "exact", head: true }),
      context.supabase.from("itineraries").select("id", { count: "exact", head: true }),
    ]);
    const states = new Set((v.data ?? []).map((r) => r.place_state).filter(Boolean));
    return {
      visitedCount: v.count ?? 0,
      statesCount: states.size,
      wishlistCount: w.count ?? 0,
      tripsCount: i.count ?? 0,
    };
  });

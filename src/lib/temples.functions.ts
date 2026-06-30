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

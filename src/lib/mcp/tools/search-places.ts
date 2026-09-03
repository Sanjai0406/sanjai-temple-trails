import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "search_places",
  title: "Search temples and destinations",
  description:
    "Search the public catalog of temples, hidden gems and travel spots across Tamil Nadu and India by keyword, state, category or budget.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free text: name, city, deity, district or speciality."),
    state: z.string().trim().optional().describe("Filter by Indian state, e.g. 'Tamil Nadu'."),
    category: z.string().trim().optional().describe("Category filter, e.g. 'temple', 'nature', 'heritage'."),
    hidden_gems_only: z.boolean().optional().describe("Only return underrated / hidden-gem places."),
    max_budget: z.number().positive().optional().describe("Maximum estimated budget in INR."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 15)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, state, category, hidden_gems_only, max_budget, limit }) => {
    const sb = supabaseAnon();
    let q = sb
      .from("temples")
      .select("slug,name,city,district,state,category,deity,speciality,best_time,estimated_budget,rating,is_hidden_gem,is_unesco,latitude,longitude")
      .limit(limit ?? 15);
    if (state) q = q.eq("state", state);
    if (category) q = q.eq("category", category);
    if (hidden_gems_only) q = q.eq("is_hidden_gem", true);
    if (typeof max_budget === "number") q = q.lte("estimated_budget", max_budget);
    if (query) {
      q = q.or(
        `name.ilike.%${query}%,city.ilike.%${query}%,deity.ilike.%${query}%,district.ilike.%${query}%,speciality.ilike.%${query}%`,
      );
    }
    q = q.order("rating", { ascending: false, nullsFirst: false });

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { places: data ?? [] },
    };
  },
});

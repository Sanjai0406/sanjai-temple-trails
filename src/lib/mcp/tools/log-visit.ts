import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "log_visit",
  title: "Log a visited place",
  description: "Record that the signed-in user visited a place, with optional date, rating and notes.",
  inputSchema: {
    place_name: z.string().trim().min(1).describe("Name of the place visited."),
    place_state: z.string().trim().optional().describe("State the place is in."),
    visit_date: z.string().trim().optional().describe("Visit date in YYYY-MM-DD."),
    rating: z.number().min(1).max(5).optional().describe("Rating out of 5."),
    notes: z.string().trim().optional().describe("Memories or tips from the visit."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ place_name, place_state, visit_date, rating, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("visited_places")
      .insert({
        user_id: ctx.getUserId()!,
        place_name,
        place_state: place_state ?? null,
        visit_date: visit_date ?? null,
        rating: rating ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Logged visit: ${place_name}` }], structuredContent: { visit: data } };
  },
});

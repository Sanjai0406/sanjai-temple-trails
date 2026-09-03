import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_to_wishlist",
  title: "Add to my wishlist",
  description: "Save a place to the signed-in user's wishlist, either by catalog slug or as a custom place.",
  inputSchema: {
    slug: z.string().trim().optional().describe("Catalog slug of the place to save."),
    custom_name: z.string().trim().optional().describe("Name of a place not in the catalog."),
    custom_location: z.string().trim().optional().describe("City/state for a custom place."),
    note: z.string().trim().optional().describe("Personal note about why to visit."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ slug, custom_name, custom_location, note }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    if (!slug && !custom_name) {
      return { content: [{ type: "text", text: "Provide either slug or custom_name." }], isError: true };
    }
    const sb = supabaseForUser(ctx);

    let templeId: string | null = null;
    if (slug) {
      const { data: temple, error: tErr } = await sb.from("temples").select("id,name").eq("slug", slug).maybeSingle();
      if (tErr) return { content: [{ type: "text", text: tErr.message }], isError: true };
      if (!temple) return { content: [{ type: "text", text: `No place found for slug "${slug}".` }], isError: true };
      templeId = temple.id;
    }

    const { data, error } = await sb
      .from("wishlist")
      .insert({
        user_id: ctx.getUserId()!,
        temple_id: templeId,
        custom_name: custom_name ?? null,
        custom_location: custom_location ?? null,
        note: note ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Saved to wishlist: ${slug ?? custom_name}` }],
      structuredContent: { item: data },
    };
  },
});

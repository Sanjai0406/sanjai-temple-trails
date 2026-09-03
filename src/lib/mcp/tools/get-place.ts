import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export default defineTool({
  name: "get_place",
  title: "Get place details",
  description: "Fetch full details for one temple or destination by its slug (history, timings, dress code, budget, best time).",
  inputSchema: { slug: z.string().trim().min(1).describe("Place slug, e.g. 'brihadeeswarar-temple'.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }) => {
    const sb = supabaseAnon();
    const { data, error } = await sb.from("temples").select("*").eq("slug", slug).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No place found for slug "${slug}".` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { place: data },
    };
  },
});

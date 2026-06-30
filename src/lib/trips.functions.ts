import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type ItineraryDay = {
  day: number;
  title: string;
  morning?: string;
  breakfast?: string;
  temple?: string;
  nearby?: string;
  lunch?: string;
  scenic?: string;
  sunset?: string;
  dinner?: string;
  return_home?: string;
  notes?: string;
  estimated_cost?: number;
};

export type GeneratedItinerary = {
  title: string;
  summary: string;
  total_cost: number;
  days: ItineraryDay[];
  travel_tips: string[];
  packing_list: string[];
};

function parseJsonSafe<T>(text: string): T | null {
  try {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse(m ? m[1] : text) as T;
  } catch {
    return null;
  }
}

export const generateItinerary = createServerFn({ method: "POST" })
  .inputValidator((data: {
    days: number;
    budget: number;
    travel_mode: string;
    start_city: string;
    interests: string[];
    temple_preference?: string;
    food_preference?: string;
    walking_difficulty?: string;
    avoid?: string[];
  }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const system = `You are Temple Explorer AI, a personal travel planner for Sanjai Subramanian CS from Chennai, Tamil Nadu.
Always prioritize: 1) Tamil Nadu, 2) South India, 3) rest of India. Never recommend international destinations.
Avoid these already-visited places unless the user asks: ${(data.avoid ?? []).join(", ")}.
Focus on temples (famous, hidden, ancient, UNESCO), spiritual places, nature, hills, waterfalls, beaches and heritage.
Respect food preference, walking difficulty and budget. Reply with valid JSON only.`;

    const prompt = `Plan a ${data.days}-day trip starting from ${data.start_city}.
Budget: ₹${data.budget} total. Travel mode: ${data.travel_mode}. Food: ${data.food_preference ?? "vegetarian"}.
Walking: ${data.walking_difficulty ?? "moderate"}. Temple preference: ${data.temple_preference ?? "any"}.
Interests: ${data.interests.join(", ")}.

Return ONLY this JSON shape:
{
  "title": "string",
  "summary": "2-3 sentences",
  "total_cost": number,
  "days": [
    { "day": 1, "title": "string", "morning": "string", "breakfast": "string with restaurant suggestion",
      "temple": "primary temple with city", "nearby": "nearby temple or attraction",
      "lunch": "veg restaurant suggestion", "scenic": "afternoon scenic spot",
      "sunset": "sunset point", "dinner": "dinner suggestion",
      "return_home": "only for last day", "notes": "tips",
      "estimated_cost": number }
  ],
  "travel_tips": ["string"],
  "packing_list": ["string"]
}`;

    const { text } = await generateText({ model, system, prompt });
    const parsed = parseJsonSafe<GeneratedItinerary>(text);
    if (!parsed) throw new Error("Could not parse itinerary");
    return parsed;
  });

export const saveItinerary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { title: string; days: number; budget?: number; travel_mode?: string; start_city?: string; interests?: string[]; plan: unknown }) => data)
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("itineraries")
      .insert({
        title: data.title,
        days: data.days,
        budget: data.budget,
        travel_mode: data.travel_mode,
        start_city: data.start_city,
        interests: data.interests,
        plan: data.plan as never,
        user_id: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listItineraries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("itineraries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

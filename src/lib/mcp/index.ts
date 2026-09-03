import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchPlaces from "./tools/search-places";
import getPlace from "./tools/get-place";
import listWishlist from "./tools/list-wishlist";
import addToWishlist from "./tools/add-to-wishlist";
import listVisited from "./tools/list-visited";
import logVisit from "./tools/log-visit";
import listItineraries from "./tools/list-itineraries";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "sanjai-s-sacred-journeys",
  title: "Sanjai's Sacred Journeys",
  version: "0.1.0",
  instructions:
    "Tools for Sanjai's Travel AI, a temple and travel planner for Tamil Nadu and India. Use `search_places` and `get_place` to browse the public catalog of temples, hidden gems and destinations. Use `list_wishlist`, `add_to_wishlist`, `list_visited`, `log_visit` and `list_itineraries` to read and update the signed-in user's saved travel data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchPlaces, getPlace, listWishlist, addToWishlist, listVisited, logVisit, listItineraries],
});

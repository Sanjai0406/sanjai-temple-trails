export const CATEGORIES = [
  { id: "all", label: "All", icon: "🕉️" },
  { id: "shiva", label: "Shiva Temples", icon: "🔱" },
  { id: "murugan", label: "Murugan Temples", icon: "🦚" },
  { id: "perumal", label: "Perumal Temples", icon: "🐚" },
  { id: "amman", label: "Amman Temples", icon: "🌺" },
  { id: "jyotirlinga", label: "Jyotirlinga", icon: "🕯️" },
  { id: "divya_desam", label: "Divya Desam", icon: "📿" },
  { id: "unesco", label: "UNESCO Sites", icon: "🏛️" },
  { id: "hidden", label: "Hidden Gems", icon: "💎" },
  { id: "hill", label: "Hill Stations", icon: "⛰️" },
  { id: "waterfall", label: "Waterfalls", icon: "💧" },
  { id: "beach", label: "Beaches", icon: "🌊" },
  { id: "historical", label: "Historical", icon: "🏯" },
] as const;

export const TAMIL_STATES = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Puducherry"];

/** Region → states, used by the Explore region filter. */
export const REGIONS = [
  { id: "all", label: "All India", states: [] as string[] },
  { id: "south", label: "South", states: ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Puducherry"] },
  { id: "north", label: "North", states: ["Himachal Pradesh", "Uttarakhand", "Ladakh", "Jammu & Kashmir", "Punjab", "Haryana", "Delhi", "Uttar Pradesh"] },
  { id: "west", label: "West", states: ["Rajasthan", "Gujarat", "Maharashtra", "Goa"] },
  { id: "east", label: "East", states: ["Odisha", "West Bengal", "Bihar", "Jharkhand"] },
  { id: "central", label: "Central", states: ["Madhya Pradesh", "Chhattisgarh"] },
  { id: "northeast", label: "North East", states: ["Assam", "Arunachal Pradesh", "Meghalaya", "Nagaland", "Manipur", "Mizoram", "Tripura", "Sikkim"] },
] as const;

/** Season → representative months (0-indexed) matched against `best_time`. */
export const SEASONS = [
  { id: "any", label: "Any season", months: [] as number[] },
  { id: "winter", label: "❄️ Winter (Nov–Feb)", months: [10, 11, 0, 1] },
  { id: "spring", label: "🌸 Spring (Mar–Apr)", months: [2, 3] },
  { id: "summer", label: "☀️ Summer (May–Jun)", months: [4, 5] },
  { id: "monsoon", label: "🌧️ Monsoon (Jul–Sep)", months: [6, 7, 8] },
  { id: "autumn", label: "🍂 Autumn (Oct)", months: [9] },
] as const;

/** Budget bands in ₹ per person for a typical trip. */
export const BUDGET_BANDS = [
  { id: "any", label: "Any budget", min: undefined as number | undefined, max: undefined as number | undefined },
  { id: "shoestring", label: "₹0 – ₹1,000", min: 0, max: 1000 },
  { id: "easy", label: "₹1,000 – ₹3,000", min: 1000, max: 3000 },
  { id: "comfort", label: "₹3,000 – ₹6,000", min: 3000, max: 6000 },
  { id: "premium", label: "₹6,000+", min: 6000, max: undefined },
] as const;


export const VISITED_SEED = [
  "Bangalore","Yelagiri","Yercaud","Hyderabad","Madurai","Trichy","Tiruchendur","Coimbatore","Tirupati",
];

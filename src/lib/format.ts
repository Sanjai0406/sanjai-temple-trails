export const inr = (n?: number | null) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—";

export const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

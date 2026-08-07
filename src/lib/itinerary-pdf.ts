import jsPDF from "jspdf";
import type { GeneratedItinerary, ItineraryDay } from "@/lib/trips.functions";
import type { DayForecast } from "@/lib/weather.functions";
import type { AdjustedDay } from "@/lib/weather-adjust";

export type PdfDay = {
  day: ItineraryDay;
  date?: string;
  forecast?: DayForecast;
  adjusted?: AdjustedDay;
};

/** jsPDF core fonts are WinAnsi-only; map common typographic chars. */
const clean = (s: string) =>
  s
    .replace(/\u2192/g, "->")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/[^\u0000-\u00FF]/g, "");

const rs = (n?: number | null) => (typeof n === "number" ? `Rs. ${n.toLocaleString("en-IN")}` : "-");

const fmtDate = (iso?: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const weatherLine = (f?: DayForecast) => {
  if (!f) return "Forecast not available yet - seasonal averages apply";
  const parts = [
    f.max != null ? `${Math.round(f.max)}\u00B0C` : null,
    f.min != null ? `low ${Math.round(f.min)}\u00B0C` : null,
    f.condition || null,
    f.rain != null ? `${f.rain}% rain` : null,
  ].filter(Boolean);
  return parts.join("  |  ");
};

export function buildItineraryPdf(plan: GeneratedItinerary, days: PdfDay[], meta: { startCity?: string; travelMode?: string }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  const nl = (h: number) => {
    if (y + h > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [40, 34, 28]));
    const indent = opts.indent ?? 0;
    const lines = doc.splitTextToSize(clean(s), W - M * 2 - indent) as string[];
    const lh = size * 1.35;
    for (const line of lines) {
      nl(lh);
      doc.text(line, M + indent, y);
      y += lh;
    }
    y += opts.gap ?? 0;
  };

  // Header band
  doc.setFillColor(198, 124, 34);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(255, 250, 242);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(doc.splitTextToSize(clean(plan.title), W - M * 2)[0], M, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Sanjai's Travel AI  -  itinerary export", M, 68);
  y = 128;

  text(plan.summary, { size: 10, color: [90, 80, 70], gap: 8 });
  const facts = [
    `Days: ${days.length}`,
    days[0]?.date ? `Start: ${fmtDate(days[0].date)}` : null,
    meta.startCity ? `From: ${meta.startCity}` : null,
    meta.travelMode ? `Mode: ${meta.travelMode}` : null,
    `Estimated total: ${rs(plan.total_cost)}`,
  ].filter(Boolean) as string[];
  text(facts.join("   |   "), { size: 9, bold: true, color: [140, 95, 20], gap: 12 });

  for (const { day, date, forecast, adjusted } of days) {
    nl(70);
    doc.setDrawColor(226, 214, 198);
    doc.line(M, y, W - M, y);
    y += 18;

    text(`Day ${day.day}  -  ${day.title}`, { size: 13, bold: true, gap: 2 });
    const sub = [fmtDate(date), day.estimated_cost != null ? rs(day.estimated_cost) : null].filter(Boolean).join("   |   ");
    if (sub) text(sub, { size: 9, color: [130, 120, 108] });
    text(`Weather: ${weatherLine(forecast)}`, { size: 9, color: [90, 110, 140], gap: 4 });

    if (adjusted?.headline) {
      text(adjusted.headline, { size: 9.5, bold: true, color: [176, 94, 20] });
      for (const c of adjusted.changes ?? []) {
        text(`- ${c.label} adjusted - ${c.reason}`, { size: 9, color: [130, 120, 108], indent: 10 });
      }
      y += 4;
    }

    const v = (k: keyof ItineraryDay) => (adjusted?.values?.[k] as string | undefined) ?? (day[k] as string | undefined);
    const rows: Array<[string, string | undefined]> = [
      ["Morning", v("morning")],
      ["Breakfast", day.breakfast],
      ["Temple", v("temple")],
      ["Nearby", day.nearby],
      ["Lunch", day.lunch],
      ["Afternoon", v("scenic")],
      ["Sunset", v("sunset")],
      ["Dinner", day.dinner],
      ["Return", day.return_home],
      ["Notes", v("notes")],
    ];
    for (const [label, value] of rows) {
      if (!value) continue;
      const size = 9.5;
      const lh = size * 1.35;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(120, 108, 96);
      const lines = doc.splitTextToSize(clean(value), W - M * 2 - 84) as string[];
      nl(lh * lines.length);
      doc.text(label, M, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 34, 28);
      for (const line of lines) {
        nl(lh);
        doc.text(line, M + 84, y);
        y += lh;
      }
      y += 2;
    }
    y += 8;
  }

  const changed = days.filter((d) => (d.adjusted?.changes?.length ?? 0) > 0);
  if (changed.length) {
    nl(80);
    y += 6;
    text("Forecast-based changes", { size: 13, bold: true, gap: 4 });
    for (const d of changed) {
      text(`Day ${d.day.day}${d.date ? ` - ${fmtDate(d.date)}` : ""}: ${d.adjusted?.headline ?? ""}`, { size: 10, bold: true });
      for (const c of d.adjusted!.changes) {
        text(`- ${c.label}: ${c.to}`, { size: 9, indent: 10, color: [60, 52, 44] });
        if (c.from) text(`  was: ${c.from}`, { size: 8.5, indent: 10, color: [150, 140, 130] });
        text(`  why: ${c.reason}`, { size: 8.5, indent: 10, color: [176, 94, 20], gap: 2 });
      }
      y += 4;
    }
  }

  const lists: Array<[string, string[] | undefined]> = [
    ["Travel tips", plan.travel_tips],
    ["Packing list", plan.packing_list],
  ];
  for (const [title, items] of lists) {
    if (!items?.length) continue;
    nl(60);
    y += 6;
    text(title, { size: 13, bold: true, gap: 4 });
    for (const i of items) text(`- ${i}`, { size: 9.5, indent: 6 });
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 150, 140);
    doc.text(`Sanjai's Travel AI  -  page ${p} of ${pages}`, M, H - 24);
  }

  return doc;
}

export function downloadItineraryPdf(plan: GeneratedItinerary, days: PdfDay[], meta: { startCity?: string; travelMode?: string }) {
  const doc = buildItineraryPdf(plan, days, meta);
  const name = plan.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "itinerary";
  doc.save(`${name}.pdf`);
}

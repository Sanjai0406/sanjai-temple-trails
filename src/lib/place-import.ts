/**
 * Pure, dependency-free validation helpers used when importing new places
 * into the catalog. Kept browser-safe so both server functions and tests
 * can import them.
 */

export type PlaceCandidate = {
  slug?: string | null;
  name: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  hero_image?: string | null;
  google_photo_ref?: string | null;
};

export type ExistingPlace = PlaceCandidate & { id?: string };

export type DuplicateIssue = {
  candidate: string;
  reason: "same_slug" | "same_name" | "same_coordinates" | "duplicate_in_batch";
  matches: string;
  distance_m?: number;
};

export type PhotoIssue = {
  candidate: string;
  reason: "missing_photo" | "missing_photo_ref" | "invalid_url" | "broken_url";
  detail: string;
  url?: string | null;
};

/** Default proximity (metres) under which two places are treated as the same spot. */
export const DUPLICATE_RADIUS_M = 200;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Drop generic words so "Sri X Temple" === "X Kovil"
    .replace(/\b(sri|shri|thiru|arulmigu|temple|kovil|koil|kshetra|mandir|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Great-circle distance in metres. */
export function distanceMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function label(p: PlaceCandidate): string {
  return p.slug || slugify(p.name);
}

/**
 * Flags candidates that collide with existing catalog rows (or with each
 * other) by slug, normalized name + state, or coordinate proximity.
 */
export function findDuplicates(
  candidates: PlaceCandidate[],
  existing: ExistingPlace[],
  radiusM: number = DUPLICATE_RADIUS_M,
): DuplicateIssue[] {
  const issues: DuplicateIssue[] = [];
  const seen: PlaceCandidate[] = [];

  const compare = (c: PlaceCandidate, e: PlaceCandidate, inBatch: boolean) => {
    const key = label(c);
    if (c.slug && e.slug && c.slug === e.slug) {
      issues.push({
        candidate: key,
        reason: inBatch ? "duplicate_in_batch" : "same_slug",
        matches: label(e),
      });
      return true;
    }
    const cn = normalizeName(c.name);
    const en = normalizeName(e.name);
    if (cn && cn === en && (c.state ?? "") === (e.state ?? "")) {
      issues.push({
        candidate: key,
        reason: inBatch ? "duplicate_in_batch" : "same_name",
        matches: label(e),
      });
      return true;
    }
    const cLat = toNum(c.latitude), cLng = toNum(c.longitude);
    const eLat = toNum(e.latitude), eLng = toNum(e.longitude);
    if (cLat !== null && cLng !== null && eLat !== null && eLng !== null) {
      const d = distanceMeters(cLat, cLng, eLat, eLng);
      if (d <= radiusM) {
        issues.push({
          candidate: key,
          reason: inBatch ? "duplicate_in_batch" : "same_coordinates",
          matches: label(e),
          distance_m: d,
        });
        return true;
      }
    }
    return false;
  };

  for (const c of candidates) {
    let flagged = false;
    for (const e of existing) {
      if (compare(c, e, false)) { flagged = true; break; }
    }
    if (!flagged) {
      for (const s of seen) {
        if (compare(c, s, true)) { flagged = true; break; }
      }
    }
    seen.push(c);
  }

  return issues;
}

/** Returns the candidates that are safe to insert (no duplicate issue). */
export function dedupePlaces<T extends PlaceCandidate>(
  candidates: T[],
  existing: ExistingPlace[],
  radiusM: number = DUPLICATE_RADIUS_M,
): { unique: T[]; duplicates: DuplicateIssue[] } {
  const duplicates = findDuplicates(candidates, existing, radiusM);
  const bad = new Set(duplicates.map((d) => d.candidate));
  return { unique: candidates.filter((c) => !bad.has(label(c))), duplicates };
}

/** Static (no network) checks on a place's photo fields. */
export function inspectPhotoFields(p: PlaceCandidate): PhotoIssue[] {
  const key = label(p);
  const out: PhotoIssue[] = [];
  const url = p.hero_image?.trim();

  if (!url) {
    out.push({ candidate: key, reason: "missing_photo", detail: "hero_image is empty" });
  } else {
    let parsed: URL | null = null;
    try { parsed = new URL(url); } catch { parsed = null; }
    if (!parsed || !/^https?:$/.test(parsed.protocol)) {
      out.push({ candidate: key, reason: "invalid_url", detail: "hero_image is not a valid http(s) URL", url });
    }
  }

  if (!p.google_photo_ref) {
    out.push({
      candidate: key,
      reason: "missing_photo_ref",
      detail: "no google_photo_ref stored — the photo cannot self-heal when the URL expires",
    });
  }

  return out;
}

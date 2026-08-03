import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  dedupePlaces,
  findDuplicates,
  inspectPhotoFields,
  type DuplicateIssue,
  type ExistingPlace,
  type PhotoIssue,
  type PlaceCandidate,
} from "./place-import";

function anonClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export async function loadCatalog(): Promise<ExistingPlace[]> {
  const sb = anonClient();
  const { data, error } = await sb
    .from("temples")
    .select("id, slug, name, city, state, latitude, longitude, hero_image, google_photo_ref")
    .limit(2000);
  if (error) throw new Error(error.message);
  return (data ?? []) as ExistingPlace[];
}

/** Network check: is this photo URL actually reachable right now? */
export async function probePhotoUrl(url: string): Promise<{ ok: boolean; status: number | null; detail: string }> {
  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok) return { ok: false, status: res.status, detail: `HTTP ${res.status}` };
    if (type && !type.startsWith("image/")) {
      return { ok: false, status: res.status, detail: `unexpected content-type "${type}"` };
    }
    return { ok: true, status: res.status, detail: "reachable" };
  } catch (err) {
    return { ok: false, status: null, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function probeAll(
  places: PlaceCandidate[],
  concurrency = 8,
): Promise<PhotoIssue[]> {
  const issues: PhotoIssue[] = [];
  const queue = places.filter((p) => !!p.hero_image?.trim());
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (i < queue.length) {
      const p = queue[i++];
      const url = p.hero_image!.trim();
      const res = await probePhotoUrl(url);
      if (!res.ok) {
        issues.push({
          candidate: p.slug || p.name,
          reason: "broken_url",
          detail: res.detail,
          url,
        });
      }
    }
  });
  await Promise.all(workers);
  return issues;
}

export type ValidationReport = {
  checked: number;
  ok: number;
  duplicates: DuplicateIssue[];
  photoIssues: PhotoIssue[];
  importable: string[];
};

/** Validate a batch of candidates before inserting them into the catalog. */
export async function validateCandidates(
  candidates: PlaceCandidate[],
  opts: { probeUrls?: boolean; radiusM?: number } = {},
): Promise<ValidationReport> {
  const existing = await loadCatalog();
  const { unique, duplicates } = dedupePlaces(candidates, existing, opts.radiusM);

  const photoIssues: PhotoIssue[] = unique.flatMap(inspectPhotoFields);
  if (opts.probeUrls !== false) photoIssues.push(...(await probeAll(unique)));

  const blocked = new Set(
    photoIssues.filter((p) => p.reason !== "missing_photo_ref").map((p) => p.candidate),
  );
  const importable = unique
    .map((c) => c.slug || c.name)
    .filter((k) => !blocked.has(k));

  return {
    checked: candidates.length,
    ok: importable.length,
    duplicates,
    photoIssues,
    importable,
  };
}

/** Same validation, run over everything already in the catalog. */
export async function auditCatalog(opts: { probeUrls?: boolean } = {}): Promise<ValidationReport> {
  const existing = await loadCatalog();
  const duplicates = findDuplicates(existing, []);
  const photoIssues: PhotoIssue[] = existing.flatMap(inspectPhotoFields);
  if (opts.probeUrls !== false) photoIssues.push(...(await probeAll(existing)));
  const flagged = new Set([
    ...duplicates.map((d) => d.candidate),
    ...photoIssues.filter((p) => p.reason !== "missing_photo_ref").map((p) => p.candidate),
  ]);
  return {
    checked: existing.length,
    ok: existing.length - flagged.size,
    duplicates,
    photoIssues,
    importable: [],
  };
}

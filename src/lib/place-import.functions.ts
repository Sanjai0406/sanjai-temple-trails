import { createServerFn } from "@tanstack/react-start";
import type { PlaceCandidate } from "./place-import";

/** Validate a batch of would-be imports: dedupe + photo health. */
export const validatePlaceImport = createServerFn({ method: "POST" })
  .inputValidator((input: { candidates: PlaceCandidate[]; probeUrls?: boolean; radiusM?: number }) => {
    if (!Array.isArray(input?.candidates) || input.candidates.length === 0) {
      throw new Error("candidates required");
    }
    if (input.candidates.length > 200) throw new Error("max 200 candidates per batch");
    for (const c of input.candidates) {
      if (!c?.name || typeof c.name !== "string") throw new Error("each candidate needs a name");
    }
    return {
      candidates: input.candidates,
      probeUrls: input.probeUrls !== false,
      radiusM: typeof input.radiusM === "number" ? input.radiusM : undefined,
    };
  })
  .handler(async ({ data }) => {
    const { validateCandidates } = await import("./place-import.server");
    return validateCandidates(data.candidates, { probeUrls: data.probeUrls, radiusM: data.radiusM });
  });

/** Audit the whole existing catalog for duplicates and broken photo URLs. */
export const auditPlaceCatalog = createServerFn({ method: "GET" })
  .inputValidator((input: { probeUrls?: boolean } | undefined) => ({
    probeUrls: input?.probeUrls !== false,
  }))
  .handler(async ({ data }) => {
    const { auditCatalog } = await import("./place-import.server");
    return auditCatalog({ probeUrls: data.probeUrls });
  });

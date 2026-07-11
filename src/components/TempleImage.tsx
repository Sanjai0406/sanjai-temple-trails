import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { repairTemplePhoto } from "@/lib/temple-photo.functions";

type Props = {
  slug: string;
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

type HealStatus = "idle" | "healing" | "healed" | "failed";

/**
 * Renders a temple photo with a graceful fallback:
 *   1. Show the cached URL from the DB.
 *   2. If it 404s (Google photo URL expired), silently ask the server to
 *      mint a fresh URL from the stored google_photo_ref and swap it in.
 *   3. If that fails too, fall back to a warm gradient placeholder.
 *
 * A small status chip surfaces the healed / failed state and offers a
 * manual retry when repair failed.
 */
export function TempleImage({ slug, src, alt, className, loading = "lazy" }: Props) {
  const [current, setCurrent] = useState<string | null>(src ?? null);
  const [status, setStatus] = useState<HealStatus>("idle");
  const repairedRef = useRef(false);
  const qc = useQueryClient();
  const repair = useServerFn(repairTemplePhoto);

  useEffect(() => {
    setCurrent(src ?? null);
    setStatus("idle");
    repairedRef.current = false;
  }, [src, slug]);

  const runRepair = async (isManual: boolean) => {
    if (status === "healing") return;
    repairedRef.current = true;
    setStatus("healing");
    try {
      const res = await repair({
        data: { slug, triggered_by: isManual ? "manual" : "auto" },
      });
      if (res?.hero_image) {
        setCurrent(res.hero_image);
        setStatus("healed");
        qc.invalidateQueries({ queryKey: ["temple", slug] });
        qc.invalidateQueries({ queryKey: ["featured"] });
        qc.invalidateQueries({ queryKey: ["temples"] });
        qc.invalidateQueries({ queryKey: ["photo-repairs", slug] });
      } else {
        setStatus("failed");
      }
    } catch {
      setStatus("failed");
      qc.invalidateQueries({ queryKey: ["photo-repairs", slug] });
    }
  };

  const onError = () => {
    if (repairedRef.current) {
      setStatus("failed");
      return;
    }
    void runRepair(false);
  };

  const onRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    repairedRef.current = true;
    void runRepair(true);
  };

  const showPlaceholder = !current || status === "failed";

  return (
    <div className={`relative ${className ?? ""}`}>
      {showPlaceholder ? (
        <div className="gradient-hero size-full" aria-label={alt} />
      ) : (
        <img
          src={current!}
          alt={alt}
          loading={loading}
          onError={onError}
          className="size-full object-cover"
        />
      )}

      {status === "healing" && (
        <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
          <RefreshCw className="size-3 animate-spin" />
          Refreshing photo…
        </span>
      )}

      {status === "healed" && (
        <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-600/85 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white">
          <CheckCircle2 className="size-3" />
          Photo refreshed
        </span>
      )}

      {status === "failed" && (
        <button
          type="button"
          onClick={onRetry}
          title="Retry fetching this photo from Google"
          className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-white transition"
        >
          <AlertTriangle className="size-3 text-amber-300" />
          Photo unavailable · Retry
        </button>
      )}
    </div>
  );
}

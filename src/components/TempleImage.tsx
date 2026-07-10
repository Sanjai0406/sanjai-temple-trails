import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { repairTemplePhoto } from "@/lib/temple-photo.functions";

type Props = {
  slug: string;
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

/**
 * Renders a temple photo with a graceful fallback:
 *   1. Show the cached URL from the DB.
 *   2. If it 404s (Google photo URL expired), silently ask the server to
 *      mint a fresh URL from the stored google_photo_ref and swap it in.
 *   3. If that fails too, fall back to a warm gradient placeholder.
 */
export function TempleImage({ slug, src, alt, className, loading = "lazy" }: Props) {
  const [current, setCurrent] = useState<string | null>(src ?? null);
  const [failed, setFailed] = useState(false);
  const repairedRef = useRef(false);
  const qc = useQueryClient();
  const repair = useServerFn(repairTemplePhoto);

  useEffect(() => {
    setCurrent(src ?? null);
    setFailed(false);
    repairedRef.current = false;
  }, [src, slug]);

  const onError = async () => {
    if (repairedRef.current) {
      setFailed(true);
      return;
    }
    repairedRef.current = true;
    try {
      const res = await repair({ data: { slug } });
      if (res?.hero_image) {
        setCurrent(res.hero_image);
        // Refresh cached lists so other cards pick up the healed URL.
        qc.invalidateQueries({ queryKey: ["temple", slug] });
        qc.invalidateQueries({ queryKey: ["featured"] });
        qc.invalidateQueries({ queryKey: ["temples"] });
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    }
  };

  if (!current || failed) {
    return <div className={`gradient-hero ${className ?? ""}`} aria-label={alt} />;
  }

  return (
    <img
      src={current}
      alt={alt}
      loading={loading}
      onError={onError}
      className={className}
    />
  );
}

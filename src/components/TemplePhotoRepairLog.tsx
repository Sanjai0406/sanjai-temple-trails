import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Database, Search, RefreshCw, History, User, Sparkles } from "lucide-react";
import { listTemplePhotoRepairs } from "@/lib/temple-photo.functions";

type Props = { slug: string; compact?: boolean };

const SOURCE_META: Record<string, { label: string; icon: typeof Database }> = {
  cached_ref: { label: "Cached Google reference", icon: Database },
  search: { label: "New Google search", icon: Search },
  manual_refresh: { label: "Manual refresh", icon: RefreshCw },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function TemplePhotoRepairLog({ slug, compact = false }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["photo-repairs", slug],
    queryFn: () => listTemplePhotoRepairs({ data: { slug, limit: 10 } }),
    refetchOnWindowFocus: false,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const successes = logs.filter((l) => l.success).length;
  const failures = logs.length - successes;
  const lastHealed = logs.find((l) => l.success);

  if (compact) {
    // Hide entirely when there's nothing to report — keeps the card grid tidy.
    if (isLoading || total === 0) return null;
    return (
      <div className="mt-1.5 px-3.5 pb-3 -mt-1">
        <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] flex items-center flex-wrap gap-x-2 gap-y-0.5">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Sparkles className="size-3 text-primary" />
            {total} repair{total === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="size-3" />
            {successes}
          </span>
          {failures > 0 && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <XCircle className="size-3" />
              {failures}
            </span>
          )}
          {lastHealed && (
            <span className="text-muted-foreground ml-auto">
              healed <span className="text-foreground font-medium">{timeAgo(lastHealed.created_at)}</span>
            </span>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="temple-card p-4 mt-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Photo repair log</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Sparkles className="size-3" />{total} total</span>
          <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3" />{successes}</span>
          <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="size-3" />{failures}</span>
        </div>
      </div>

      {lastHealed && (
        <div className="text-xs text-muted-foreground mb-3">
          Last healed <span className="text-foreground font-medium">{timeAgo(lastHealed.created_at)}</span>
          {" · "}source{" "}
          <span className="text-foreground font-medium">
            {SOURCE_META[lastHealed.source]?.label ?? lastHealed.source}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading repair history…</div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          No repair attempts recorded yet. This photo has been stable.
        </div>
      ) : (
        <ol className="space-y-2">
          {logs.map((log) => {
            const meta = SOURCE_META[log.source] ?? { label: log.source, icon: Database };
            const Icon = meta.icon;
            return (
              <li
                key={log.id}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-2.5"
              >
                <div
                  className={`mt-0.5 rounded-full p-1.5 ${
                    log.success ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {log.success ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-medium">
                      {log.success ? "Healed" : "Failed"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Icon className="size-3" />
                      {meta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <User className="size-3" />
                      {log.triggered_by === "manual" ? "manual" : "auto"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(log.created_at).toLocaleString()} · {timeAgo(log.created_at)}
                  </div>
                  {log.success && log.photo_uri && (
                    <a
                      href={log.photo_uri}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline truncate block mt-0.5"
                      title={log.photo_uri}
                    >
                      {log.photo_uri}
                    </a>
                  )}
                  {!log.success && log.error_message && (
                    <div className="text-[11px] text-destructive mt-0.5 line-clamp-2">
                      {log.error_message}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

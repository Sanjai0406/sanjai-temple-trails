import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWishlist, removeFromWishlist } from "@/lib/profile.functions";
import { Heart, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist · Sanjai's Travel AI" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const qc = useQueryClient();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user)); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getWishlist(),
    enabled: !!authed,
  });
  const del = useMutation({
    mutationFn: (id: string) => removeFromWishlist({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["wishlist"] }); },
  });

  if (authed === false) return <SignedOut title="Wishlist" />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Heart className="size-7 text-primary" /> Wishlist</h1>
      <p className="text-sm text-muted-foreground">Places you've saved to visit.</p>

      {isLoading ? <div className="mt-6 h-40 animate-pulse bg-muted rounded-xl" /> :
       !data?.length ? <Empty msg="No places saved yet. Browse Explore and tap the heart." /> : (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((w: any) => (
            <div key={w.id} className="temple-card overflow-hidden">
              {w.temples?.hero_image && <img src={w.temples.hero_image} alt="" className="aspect-[4/3] w-full object-cover" />}
              <div className="p-4">
                <div className="font-display font-semibold">{w.temples?.name ?? w.custom_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="size-3" />{w.temples?.city ?? w.custom_location}</div>
                <div className="flex justify-between items-center mt-3">
                  {w.temples?.slug && <Link to="/temple/$slug" params={{ slug: w.temples.slug }} className="text-sm text-primary">View →</Link>}
                  <button onClick={() => del.mutate(w.id)} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-destructive">
                    <Trash2 className="size-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SignedOut({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground mt-2">Sign in to save and sync across devices.</p>
      <Link to="/auth" className="mt-4 inline-flex rounded-lg gradient-hero text-primary-foreground px-4 py-2 text-sm font-medium">Sign in</Link>
    </div>
  );
}
function Empty({ msg }: { msg: string }) { return <div className="mt-12 text-center text-muted-foreground">{msg}</div>; }

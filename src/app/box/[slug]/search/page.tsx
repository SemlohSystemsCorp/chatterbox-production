import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Search, Hash, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDistanceToNow } from "date-fns";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const query = (q || "").trim();

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) notFound();

  const { data: membership } = await supabase
    .from("box_members")
    .select("id")
    .eq("box_id", box.id)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  // Get channels in this box the user can see
  const { data: allChannels } = await supabase
    .from("channels")
    .select("id, name, slug, is_private")
    .eq("box_id", box.id)
    .eq("is_archived", false);

  const { data: myMemberships } = await supabase
    .from("channel_members")
    .select("channel_id")
    .eq("user_id", user.id);

  const myChannelIds = new Set((myMemberships || []).map((m) => m.channel_id));
  const visibleChannels = (allChannels || []).filter(
    (c) => !c.is_private || myChannelIds.has(c.id)
  );
  const visibleChannelIds = visibleChannels.map((c) => c.id);
  const channelMap = Object.fromEntries(visibleChannels.map((c) => [c.id, c]));

  // Get conversations the user is in for this box
  const { data: myConvMemberships } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", user.id);

  const myConvIds = new Set(
    (myConvMemberships || []).map((m) => m.conversation_id)
  );

  const { data: boxConvs } = await admin
    .from("conversations")
    .select("id")
    .eq("box_id", box.id);

  const visibleConvIds = (boxConvs || [])
    .map((c) => c.id)
    .filter((id) => myConvIds.has(id));

  type Result = {
    id: string;
    content: string;
    created_at: string;
    channel_id: string | null;
    conversation_id: string | null;
    user_id: string | null;
    profile: { display_name: string | null; username: string | null } | null;
  };

  let results: Result[] = [];

  if (query.length >= 2) {
    const channelResults = visibleChannelIds.length
      ? await admin
          .from("messages")
          .select("id, content, created_at, channel_id, conversation_id, user_id")
          .in("channel_id", visibleChannelIds)
          .ilike("content", `%${query}%`)
          .eq("is_deleted", false)
          .is("thread_id", null)
          .order("created_at", { ascending: false })
          .limit(30)
      : { data: [] };

    const dmResults = visibleConvIds.length
      ? await admin
          .from("messages")
          .select("id, content, created_at, channel_id, conversation_id, user_id")
          .in("conversation_id", visibleConvIds)
          .ilike("content", `%${query}%`)
          .eq("is_deleted", false)
          .is("thread_id", null)
          .order("created_at", { ascending: false })
          .limit(20)
      : { data: [] };

    const rawMessages = [
      ...((channelResults.data || []) as any[]),
      ...((dmResults.data || []) as any[]),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 50);

    // Fetch profiles separately
    const userIds = [...new Set(rawMessages.map((m) => m.user_id).filter(Boolean))] as string[];
    const { data: profileRows } = userIds.length
      ? await admin
          .from("profiles")
          .select("id, display_name, username")
          .in("id", userIds)
      : { data: [] };

    const profileMap: Record<string, { display_name: string | null; username: string | null }> = {};
    (profileRows || []).forEach((p: any) => {
      profileMap[p.id] = { display_name: p.display_name, username: p.username };
    });

    results = rawMessages.map((m) => ({
      ...m,
      profile: m.user_id ? profileMap[m.user_id] ?? null : null,
    }));
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlight(text: string, term: string) {
    const safe = escapeHtml(text);
    const safeTerm = escapeHtml(term);
    if (!safeTerm) return safe;
    const idx = safe.toLowerCase().indexOf(safeTerm.toLowerCase());
    if (idx === -1) return safe;
    const start = Math.max(0, idx - 80);
    const end = Math.min(safe.length, idx + safeTerm.length + 80);
    const snippet =
      (start > 0 ? "…" : "") +
      safe.slice(start, idx) +
      `<mark class="bg-yellow-100 rounded-sm px-0.5">${safe.slice(idx, idx + safeTerm.length)}</mark>` +
      safe.slice(idx + safeTerm.length, end) +
      (end < safe.length ? "…" : "");
    return snippet;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-6 py-4">
        <h1 className="mb-3 text-base font-semibold text-foreground">
          Search messages
        </h1>
        <form method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Search for messages..."
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-4 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {query.length >= 2 ? (
          results.length > 0 ? (
            <div className="space-y-2">
              <p className="mb-3 text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query}&rdquo;
                </span>
              </p>
              {results.map((msg) => {
                const channel = msg.channel_id
                  ? channelMap[msg.channel_id]
                  : null;
                const href = channel
                  ? `/box/${slug}/c/${channel.slug}`
                  : `/box/${slug}/dm`;
                const sender =
                  msg.profile?.display_name ||
                  msg.profile?.username ||
                  "Unknown";

                return (
                  <Link
                    key={msg.id}
                    href={href}
                    className="block rounded-lg border border-border bg-white p-4 transition-colors hover:bg-accent"
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {channel ? (
                        <Hash className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      <span className="font-medium text-foreground">
                        {channel ? channel.name : "Direct message"}
                      </span>
                      <span>·</span>
                      <span>{sender}</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(new Date(msg.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p
                      className="text-sm text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: highlight(msg.content, query),
                      }}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="mx-auto h-6 w-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          )
        ) : query.length > 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Type at least 2 characters to search.
          </p>
        ) : (
          <div className="py-12 text-center">
            <Search className="mx-auto h-6 w-6 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              Search across all channels and DMs in this workspace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

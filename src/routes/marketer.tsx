import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, Plus, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { api, type Post, type Social } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/marketer")({
  head: () => ({ meta: [
    { title: "AI Marketer — Pulse" },
    { name: "description", content: "Chat with your AI marketer to generate posts, build a content plan and schedule publishing." },
    { property: "og:title", content: "AI Marketer — Pulse" },
    { property: "og:description", content: "Generate posts, plan content and schedule publishing with AI." },
  ] }),
  component: Marketer,
});

type Msg = { from: "me" | "ai"; text: string };
const suggestions = ["Write a post about our new product", "Make a content plan for next week", "Give me 3 post ideas"];
const fmt = (s: string | null) => (s ? new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not scheduled");

function Marketer() {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "ai", text: "Hi! I'm your AI marketer. Ask me to write a post, build a content plan, or schedule publishing." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [socials, setSocials] = useState<Social[]>([]);
  const [cid, setCid] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const refresh = () => api.posts().then(setPosts);
  const refreshSocial = (id: number) => api.socials(id).then(setSocials);
  useEffect(() => { refresh(); api.me().then((m) => { if (m.company_id) { setCid(m.company_id); refreshSocial(m.company_id); } }); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(t = text) {
    if (!t.trim() || busy) return;
    setMsgs((m) => [...m, { from: "me", text: t }]); setText(""); setBusy(true);
    try { const r = await api.chat(t); setMsgs((m) => [...m, { from: "ai", text: r.reply }]); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_420px] min-h-screen">
      <section className="flex flex-col h-screen">
        <header className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold">AI Marketer</h1>
          <p className="text-sm text-muted-foreground">Generate, plan and schedule your content.</p>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={m.from === "me" ? "flex justify-end" : "flex gap-3"}>
              {m.from === "ai" && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground"><Sparkles className="size-4" /></span>}
              <div className={m.from === "me" ? "max-w-[75%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5" : "max-w-[75%] rounded-2xl rounded-tl-sm bg-card px-4 py-2.5 shadow-soft"}>{m.text}</div>
            </div>
          ))}
          {busy && <p className="text-sm text-muted-foreground animate-pulse pl-11">Thinking…</p>}
          <div ref={end} />
        </div>
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex flex-wrap gap-2">{suggestions.map((s) => <Button key={s} variant="secondary" size="sm" onClick={() => send(s)}>{s}</Button>)}</div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask your AI marketer…" className="bg-card" />
            <Button type="submit" disabled={busy}><Send className="size-4" /></Button>
          </form>
        </div>
      </section>
      <aside className="border-l border-border bg-secondary/40 p-5 lg:h-screen overflow-y-auto">
        <Tabs defaultValue="plan">
          <TabsList className="w-full"><TabsTrigger value="plan" className="flex-1">Plan</TabsTrigger><TabsTrigger value="platforms" className="flex-1">Platforms</TabsTrigger></TabsList>
          <TabsContent value="plan" className="space-y-3 mt-4">
            {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet — ask the AI to write one.</p>}
            {posts.map((p) => <PostCard key={p.id} post={p} onChange={refresh} />)}
          </TabsContent>
          <TabsContent value="platforms" className="mt-4">{cid && <Platforms cid={cid} socials={socials} onChange={() => refreshSocial(cid)} />}</TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}

function PostCard({ post, onChange }: { post: Post; onChange: () => void }) {
  const [when, setWhen] = useState("");
  const act = async (fn: Promise<unknown>, msg: string) => { try { await fn; toast.success(msg); onChange(); } catch (e) { toast.error((e as Error).message); } };
  return (
    <Card className="border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={post.status === "published" ? "default" : "secondary"} className="capitalize">{post.status}</Badge>
          <span className="text-xs text-muted-foreground capitalize">{post.platform} · {fmt(post.scheduled_at)}</span>
        </div>
        <p className="text-sm leading-relaxed">{post.text}</p>
        {post.status !== "published" && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => act(api.decide(post.id, "approve"), "Approved")}><Check className="size-3.5" />Approve</Button>
            <Button size="sm" variant="secondary" onClick={() => act(api.decide(post.id, "revise", "make it shorter"), "Revision requested")}><RotateCcw className="size-3.5" />Revise</Button>
            <Button size="sm" variant="ghost" onClick={() => act(api.decide(post.id, "reject"), "Rejected")}><X className="size-3.5" /></Button>
          </div>
        )}
        {post.status !== "published" && (
          <div className="flex gap-2">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-8 text-xs bg-background" />
            <Button size="sm" variant="outline" disabled={!when} onClick={() => act(api.schedule(post.id, new Date(when).toISOString()), "Scheduled")}><CalendarClock className="size-3.5" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Platforms({ cid, socials, onChange }: { cid: number; socials: Social[]; onChange: () => void }) {
  const [platform, setPlatform] = useState("telegram");
  const [channel, setChannel] = useState("");
  return (
    <Card className="border-border">
      <CardHeader className="pb-3"><CardTitle className="text-base">Connected platforms</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {socials.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-sm">
            <span><span className="font-medium capitalize">{s.platform}</span> · {s.channel_id}</span>
            <Button size="sm" variant="ghost" onClick={() => api.revokeSocial(s.id).then(onChange)}>Disconnect</Button>
          </div>
        ))}
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!channel) return; await api.addSocial(cid, channel, platform); setChannel(""); toast.success("Platform connected"); onChange(); }}>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-32 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{["telegram", "instagram", "facebook", "linkedin", "x"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="@channel or page ID" value={channel} onChange={(e) => setChannel(e.target.value)} className="bg-background" />
          <Button type="submit" size="icon"><Plus className="size-4" /></Button>
        </form>
      </CardContent>
    </Card>
  );
}

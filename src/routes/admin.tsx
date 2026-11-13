import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { api, type AuditItem, type Company, type Doc, type Member, type Operator, type Post, type Social, type Stat, type TaskItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Platforms } from "./marketer";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin panel — Pulse AI Marketer" },
    { name: "description", content: "Manage companies, knowledge, platforms, autoposting tasks and operators." },
    { property: "og:title", content: "Admin panel — Pulse AI Marketer" },
    { property: "og:description", content: "Manage companies, knowledge, platforms and tasks." },
  ] }),
  component: Admin,
});

function Admin() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cid, setCid] = useState<number | null>(null);
  const [v, setV] = useState(0);
  const bump = () => setV((x) => x + 1);
  useEffect(() => { api.stats().then(setStats); api.companies().then((c) => { setCompanies(c); setCid((x) => x ?? c[0]?.id ?? null); }); }, [v]);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold">Admin panel</h1><p className="text-muted-foreground">Everything behind your AI marketer.</p></div>
        <Select value={cid ? String(cid) : ""} onValueChange={(x) => setCid(+x)}>
          <SelectTrigger className="w-60 bg-card"><SelectValue placeholder="Select company" /></SelectTrigger>
          <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <Card key={s.label} className="bg-brand text-primary-foreground border-0 shadow-soft"><CardContent className="p-5"><p className="text-sm opacity-80">{s.label}</p><p className="font-display text-3xl font-semibold">{s.value}</p></CardContent></Card>)}
      </div>
      {cid && (
        <Tabs defaultValue="posts">
          <TabsList className="flex-wrap h-auto">{["posts", "knowledge", "platforms", "tasks", "team", "operators", "audit"].map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}</TabsList>
          <TabsContent value="posts"><PostsTab cid={cid} v={v} /></TabsContent>
          <TabsContent value="knowledge"><KnowledgeTab cid={cid} onChange={bump} /></TabsContent>
          <TabsContent value="platforms"><SocialTab cid={cid} /></TabsContent>
          <TabsContent value="tasks"><TasksTab cid={cid} /></TabsContent>
          <TabsContent value="team"><TeamTab cid={cid} /></TabsContent>
          <TabsContent value="operators"><OperatorsTab /></TabsContent>
          <TabsContent value="audit"><AuditTab cid={cid} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function useLoad<T>(fn: () => Promise<T>, deps: unknown[], init: T) {
  const [d, setD] = useState<T>(init);
  const reload = () => fn().then(setD).catch((e) => toast.error(e.message));
  useEffect(() => { reload(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return [d, reload] as const;
}

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="mt-4 border-border"><CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader><CardContent className="space-y-4">{children}</CardContent></Card>
);

function PostsTab({ cid, v }: { cid: number; v: number }) {
  const [posts] = useLoad<Post[]>(() => api.companyPosts(cid), [cid, v], []);
  return <Panel title="Posts"><Table><TableHeader><TableRow><TableHead>Post</TableHead><TableHead>Platform</TableHead><TableHead>Status</TableHead><TableHead>Scheduled</TableHead></TableRow></TableHeader>
    <TableBody>{posts.map((p) => <TableRow key={p.id}><TableCell className="max-w-md truncate">{p.text}</TableCell><TableCell className="capitalize">{p.platform}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{p.status}</Badge></TableCell><TableCell>{p.scheduled_at ? new Date(p.scheduled_at).toLocaleString() : "—"}</TableCell></TableRow>)}</TableBody></Table></Panel>;
}

function KnowledgeTab({ cid, onChange }: { cid: number; onChange: () => void }) {
  const [docs, reload] = useLoad<Doc[]>(() => api.knowledge(cid), [cid], []);
  const [t, setT] = useState(""); const [c, setC] = useState("");
  return <Panel title="Knowledge base">
    {docs.map((d) => <div key={d.id} className="flex justify-between gap-3 rounded-lg bg-muted/50 p-3"><div><p className="font-medium">{d.title}</p><p className="text-sm text-muted-foreground">{d.content}</p></div><Button variant="ghost" size="icon" onClick={() => api.deleteKnowledge(d.id).then(reload)}><Trash2 className="size-4" /></Button></div>)}
    <form className="grid gap-2" onSubmit={async (e) => { e.preventDefault(); if (!t) return; await api.addKnowledge(cid, t, c); setT(""); setC(""); reload(); onChange(); }}>
      <Input placeholder="Title" value={t} onChange={(e) => setT(e.target.value)} /><Textarea placeholder="Content the AI should know" value={c} onChange={(e) => setC(e.target.value)} />
      <Button type="submit" className="justify-self-start">Add document</Button>
    </form>
  </Panel>;
}

function SocialTab({ cid }: { cid: number }) {
  const [s, reload] = useLoad<Social[]>(() => api.socials(cid), [cid], []);
  return <div className="mt-4 max-w-xl"><Platforms cid={cid} socials={s} onChange={reload} /></div>;
}

function TasksTab({ cid }: { cid: number }) {
  const [tasks, reload] = useLoad<TaskItem[]>(() => api.tasks(cid), [cid], []);
  const [p, setP] = useState(""); const [i, setI] = useState("1440");
  return <Panel title="Autoposting tasks">
    {tasks.map((t) => <div key={t.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3"><div><p className="font-medium">{t.prompt}</p><p className="text-sm text-muted-foreground">Every {t.interval_minutes} min</p></div><Switch checked={t.active} onCheckedChange={(a) => api.toggleTask(t.id, a).then(reload)} /></div>)}
    <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (!p) return; await api.createTask(cid, p, +i); setP(""); reload(); }}>
      <Input className="flex-1 min-w-60" placeholder="Prompt, e.g. Weekly product tip" value={p} onChange={(e) => setP(e.target.value)} />
      <Input className="w-32" type="number" min={5} value={i} onChange={(e) => setI(e.target.value)} />
      <Button type="submit">Add task</Button>
    </form>
  </Panel>;
}

function TeamTab({ cid }: { cid: number }) {
  const [m] = useLoad<Member[]>(() => api.members(cid), [cid], []);
  const [code, setCode] = useState<string | null>(null);
  return <Panel title="Team">
    {m.map((u) => <div key={u.id} className="flex justify-between rounded-lg bg-muted/50 p-3"><span>{u.name}</span><Badge variant="secondary">{u.role}</Badge></div>)}
    <div className="flex items-center gap-3"><Button onClick={async () => setCode((await api.invite(cid, "editor")).code)}>Create invite code</Button>{code && <code className="rounded bg-secondary px-2 py-1 font-semibold">{code}</code>}</div>
  </Panel>;
}

function OperatorsTab() {
  const [ops, reload] = useLoad<Operator[]>(() => api.operators(), [], []);
  const [tid, setTid] = useState(""); const [n, setN] = useState("");
  return <Panel title="Operators">
    {ops.map((o) => <div key={o.telegram_id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3"><span>{o.name} <span className="text-muted-foreground">· {o.telegram_id}</span></span><Button variant="ghost" size="icon" onClick={() => api.removeOperator(o.telegram_id).then(reload)}><Trash2 className="size-4" /></Button></div>)}
    <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (!tid || !n) return; await api.addOperator(+tid, n); setTid(""); setN(""); reload(); }}>
      <Input className="w-40" placeholder="Telegram ID" value={tid} onChange={(e) => setTid(e.target.value)} /><Input className="flex-1" placeholder="Name" value={n} onChange={(e) => setN(e.target.value)} /><Button type="submit">Add</Button>
    </form>
  </Panel>;
}

function AuditTab({ cid }: { cid: number }) {
  const [a] = useLoad<AuditItem[]>(() => api.audit(cid), [cid], []);
  return <Panel title="Audit log">{a.map((x) => <div key={x.id} className="flex justify-between text-sm border-b border-border pb-2"><span>{x.action} <span className="text-muted-foreground">by {x.actor}</span></span><span className="text-muted-foreground">{new Date(x.created_at).toLocaleString()}</span></div>)}</Panel>;
}

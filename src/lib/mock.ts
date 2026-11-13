// @ts-nocheck -- loose demo store; real types live in api.ts
// Demo store used when no VITE_API_URL is configured. Persists to localStorage.
type DB = Record<string, any[]> & { seq: any };
const KEY = "ai-marketer-demo";
const now = () => new Date().toISOString();

function seed(): DB {
  return {
    seq: [100],
    companies: [{ id: 1, name: "Northwind Coffee", industry: "Food & beverage", description: "Specialty coffee roaster with 3 cafés.", audience: "Urban professionals 25-40", tone: "Warm, witty", website: "https://northwind.example", goals: "Grow Instagram, drive café visits" }],
    posts: [
      { id: 1, company_id: 1, text: "Monday fuel ☕ Our new Ethiopian single-origin is here — bright, floral, unforgettable.", status: "pending", platform: "telegram", scheduled_at: null, created_at: now() },
      { id: 2, company_id: 1, text: "Behind the roast: meet Ana, our head roaster, and the 14-minute ritual behind every batch.", status: "scheduled", platform: "instagram", scheduled_at: new Date(Date.now() + 864e5).toISOString(), created_at: now() },
      { id: 3, company_id: 1, text: "Weekend brunch pairing guide: which beans go with what.", status: "published", platform: "telegram", scheduled_at: new Date(Date.now() - 864e5).toISOString(), created_at: now() },
    ],
    knowledge: [{ id: 1, company_id: 1, title: "Brand voice", content: "Friendly, never pushy. Use coffee puns sparingly." }],
    social: [{ id: 1, company_id: 1, platform: "telegram", channel_id: "@northwind_coffee", active: true }],
    users: [{ id: 1, company_id: 1, name: "Danil", role: "owner" }],
    tasks: [{ id: 1, company_id: 1, prompt: "Write a daily morning coffee tip", interval_minutes: 1440, active: true }],
    operators: [{ telegram_id: 123456, name: "Support bot" }],
    audit: [{ id: 1, company_id: 1, action: "Company created", actor: "admin", created_at: now() }],
  };
}
function load(): DB { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch {} return seed(); }
const save = (d: DB) => localStorage.setItem(KEY, JSON.stringify(d));
const id = (d: DB) => ++d.seq[0];
const wait = () => new Promise((r) => setTimeout(r, 250));
const log = (d: DB, action: string, company_id = 1) => d.audit.unshift({ id: id(d), company_id, action, actor: "you", created_at: now() });

const IDEAS = ["Share a customer story that shows real results", "Post a quick how-to tip your audience can use today", "Announce a limited-time offer with a clear call to action", "Show the team behind the product", "Ask your audience a question to spark comments"];

export async function mockReq(method: string, path: string, body: any, extra?: Record<string, string>): Promise<any> {
  await wait();
  const d = load();
  const [p, q] = path.split("?");
  const m = (re: RegExp) => p.match(re);
  let r: any;
  const cid = () => d.companies[0]?.id ?? 1;
  if (method === "GET" && p === "/api/me") r = { id: 1, name: "Danil", role: "admin", company_id: cid() };
  else if (method === "GET" && p === "/api/posts") { const st = new URLSearchParams(q).get("status"); r = d.posts.filter((x) => !st || x.status === st); }
  else if (m(/^\/api\/posts\/(\d+)\/decision$/)) {
    const post = d.posts.find((x) => x.id === +m(/(\d+)/)![1]);
    post.status = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : "pending";
    if (body.decision === "revise") post.text = post.text + " (revised: " + (body.comment || "tightened copy") + ")";
    log(d, `Post #${post.id} ${body.decision}`); r = post;
  } else if (m(/^\/api\/posts\/(\d+)\/schedule$/)) {
    const post = d.posts.find((x) => x.id === +m(/(\d+)/)![1]); post.status = "scheduled"; post.scheduled_at = body.scheduled_at; r = post;
  } else if (p === "/api/agent/message") {
    const c = d.companies[0]; const t: string = body.text.toLowerCase();
    if (/post|write|draft|generate|пост/.test(t)) {
      const post = { id: id(d), company_id: cid(), text: `${c?.name ?? "We"}: ${body.text.replace(/^(write|generate|draft)( a)?( post)?( about)?/i, "").trim() || IDEAS[0]} — crafted in a ${c?.tone ?? "friendly"} voice for ${c?.audience ?? "your audience"}.`, status: "pending", platform: d.social[0]?.platform ?? "telegram", scheduled_at: null, created_at: now() };
      d.posts.unshift(post); r = { reply: "Here's a draft post. Review it in the plan — approve, ask for a revision, or schedule it.", post_id: post.id };
    } else if (/plan|week|schedule|план/.test(t)) {
      const base = Date.now();
      IDEAS.forEach((idea, i) => d.posts.unshift({ id: id(d), company_id: cid(), text: idea, status: "draft", platform: d.social[0]?.platform ?? "telegram", scheduled_at: new Date(base + (i + 1) * 864e5).toISOString(), created_at: now() }));
      r = { reply: `I've drafted a 5-day content plan for ${c?.name ?? "your company"}. Each idea is in the plan with a suggested date.`, post_id: null };
    } else r = { reply: `Got it. I can write a post, build a weekly plan, or suggest ideas for ${c?.name ?? "your brand"}. Try "write a post about our new product" or "make a plan for next week".`, post_id: null };
  }
  else if (p === "/api/admin/stats") r = [
    { label: "Companies", value: d.companies.length }, { label: "Posts", value: d.posts.length },
    { label: "Awaiting review", value: d.posts.filter((x) => x.status === "pending").length }, { label: "Published", value: d.posts.filter((x) => x.status === "published").length }];
  else if (p === "/api/admin/companies" && method === "GET") r = d.companies;
  else if (p === "/api/admin/companies" && method === "POST") { const c = { id: id(d), industry: "", description: "", audience: "", tone: "", website: "", goals: "", ...body }; d.companies.unshift(c); log(d, `Company ${c.name} created`, c.id); r = { id: c.id }; }
  else if (m(/^\/api\/admin\/companies\/(\d+)$/) && method === "PUT") { Object.assign(d.companies.find((x) => x.id === +m(/(\d+)/)![1]), body); r = {}; }
  else if (m(/^\/api\/admin\/companies\/(\d+)\/(\w+)$/)) {
    const [, n, kind] = m(/^\/api\/admin\/companies\/(\d+)\/(\w+)$/)!; const c = +n;
    const table = ({ knowledge: "knowledge", social: "social", users: "users", posts: "posts", tasks: "tasks" } as any)[kind];
    if (method === "GET") r = (d[table] ?? []).filter((x: any) => x.company_id === c);
    else if (kind === "invite") r = { code: Math.random().toString(36).slice(2, 10).toUpperCase() };
    else { const row = { id: id(d), company_id: c, active: true, ...body }; d[table].push(row); log(d, `${kind} added`, c); r = row; }
  }
  else if (p === "/api/tasks") { d.tasks.push({ id: id(d), company_id: +(extra?.["X-Company-Id"] ?? 1), active: true, ...body }); r = {}; }
  else if (m(/^\/api\/admin\/tasks\/(\d+)$/)) { d.tasks.find((x) => x.id === +m(/(\d+)/)![1]).active = body.active; r = {}; }
  else if (m(/^\/api\/admin\/knowledge\/(\d+)$/)) { d.knowledge = d.knowledge.filter((x) => x.id !== +m(/(\d+)/)![1]); r = {}; }
  else if (m(/^\/api\/admin\/social\/(\d+)$/)) { d.social = d.social.filter((x) => x.id !== +m(/(\d+)/)![1]); r = {}; }
  else if (p === "/api/admin/operators" && method === "GET") r = d.operators;
  else if (p === "/api/admin/operators") { d.operators.push(body); r = {}; }
  else if (m(/^\/api\/admin\/operators\/(\d+)$/)) { d.operators = d.operators.filter((x) => x.telegram_id !== +m(/(\d+)/)![1]); r = {}; }
  else if (p === "/api/admin/audit") { const c = new URLSearchParams(q).get("company_id"); r = d.audit.filter((x) => !c || x.company_id === +c); }
  else throw new Error(`Not found: ${method} ${path}`);
  save(d);
  return r;
}

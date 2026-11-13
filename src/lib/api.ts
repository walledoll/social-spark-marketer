// API client matching the user's backend contract. Set VITE_API_URL to use the real backend;
// without it, requests are served by an in-browser demo store (src/lib/mock.ts).
import { mockReq } from "./mock";

export type Me = { id: number; name: string; role: "admin" | "operator"; company_id: number | null };
export type PostStatus = "draft" | "pending" | "approved" | "rejected" | "scheduled" | "published";
export type Post = { id: number; company_id: number; text: string; status: PostStatus; platform: string; scheduled_at: string | null; created_at: string };
export type Stat = { label: string; value: number };
export type Company = { id: number; name: string; industry: string; description: string; audience: string; tone: string; website: string; goals: string };
export type Asset = { id: number; kind: string; filename: string; url: string };
export type Doc = { id: number; title: string; content: string };
export type Social = { id: number; platform: string; channel_id: string; active: boolean };
export type Member = { id: number; name: string; role: string };
export type TaskItem = { id: number; prompt: string; interval_minutes: number; active: boolean };
export type Operator = { telegram_id: number; name: string };
export type AuditItem = { id: number; action: string; actor: string; created_at: string };

const BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
const A = "/api/admin";

export function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

async function req<T = unknown>(method: string, path: string, body?: unknown, extra?: Record<string, string>): Promise<T> {
  if (!BASE) return mockReq(method, path, body, extra) as Promise<T>;
  const res = await fetch(BASE + path, { method, headers: { ...headers(), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `HTTP ${res.status}`);
  return res.json();
}

export const api = {
  me: () => req<Me>("GET", "/api/me"),
  posts: (status?: string) => req<Post[]>("GET", `/api/posts${status ? `?status=${status}` : ""}`),
  decide: (id: number, decision: "approve" | "reject" | "revise", comment = "") => req<Post>("POST", `/api/posts/${id}/decision`, { decision, comment }),
  schedule: (id: number, scheduled_at: string) => req<Post>("POST", `/api/posts/${id}/schedule`, { scheduled_at }),
  chat: (text: string) => req<{ reply: string; post_id: number | null }>("POST", "/api/agent/message", { text }),
  stats: () => req<Stat[]>("GET", `${A}/stats`),
  companies: () => req<Company[]>("GET", `${A}/companies`),
  createCompany: (c: Partial<Omit<Company, "id">> & { name: string }) => req<{ id: number }>("POST", `${A}/companies`, c),
  updateCompany: (id: number, c: Partial<Omit<Company, "id">>) => req("PUT", `${A}/companies/${id}`, c),
  knowledge: (id: number) => req<Doc[]>("GET", `${A}/companies/${id}/knowledge`),
  addKnowledge: (id: number, title: string, content: string) => req("POST", `${A}/companies/${id}/knowledge`, { title, content }),
  deleteKnowledge: (docId: number) => req("DELETE", `${A}/knowledge/${docId}`),
  socials: (id: number) => req<Social[]>("GET", `${A}/companies/${id}/social`),
  addSocial: (id: number, channel_id: string, platform = "telegram") => req("POST", `${A}/companies/${id}/social`, { platform, channel_id }),
  revokeSocial: (accountId: number) => req("DELETE", `${A}/social/${accountId}`),
  members: (id: number) => req<Member[]>("GET", `${A}/companies/${id}/users`),
  companyPosts: (id: number) => req<Post[]>("GET", `${A}/companies/${id}/posts`),
  tasks: (id: number) => req<TaskItem[]>("GET", `${A}/companies/${id}/tasks`),
  toggleTask: (taskId: number, active: boolean) => req("PATCH", `${A}/tasks/${taskId}`, { active }),
  createTask: (id: number, prompt: string, interval_minutes: number) => req("POST", "/api/tasks", { prompt, interval_minutes }, { "X-Company-Id": String(id) }),
  invite: (id: number, role: string) => req<{ code: string }>("POST", `${A}/companies/${id}/invite`, { role }),
  operators: () => req<Operator[]>("GET", `${A}/operators`),
  addOperator: (telegram_id: number, name: string) => req("POST", `${A}/operators`, { telegram_id, name }),
  removeOperator: (telegram_id: number) => req("DELETE", `${A}/operators/${telegram_id}`),
  audit: (id?: number) => req<AuditItem[]>("GET", `${A}/audit${id ? `?company_id=${id}` : ""}`),
};

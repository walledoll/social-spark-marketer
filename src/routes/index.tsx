import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Company profile — Pulse AI Marketer" },
    { name: "description", content: "Tell the AI marketer about your company, audience and tone of voice." },
    { property: "og:title", content: "Company profile — Pulse AI Marketer" },
    { property: "og:description", content: "Tell the AI marketer about your company, audience and tone of voice." },
  ] }),
  component: CompanyPage,
});

type Form = Omit<Company, "id">;
const empty: Form = { name: "", industry: "", description: "", audience: "", tone: "", website: "", goals: "" };
const fields: { k: keyof Form; label: string; area?: boolean; ph: string }[] = [
  { k: "name", label: "Company name", ph: "Northwind Coffee" },
  { k: "industry", label: "Industry", ph: "Food & beverage" },
  { k: "website", label: "Website", ph: "https://…" },
  { k: "tone", label: "Tone of voice", ph: "Warm, witty, expert" },
  { k: "description", label: "What you do", area: true, ph: "Products, services, what makes you different" },
  { k: "audience", label: "Target audience", area: true, ph: "Who you want to reach" },
  { k: "goals", label: "Marketing goals", area: true, ph: "e.g. grow followers, drive sign-ups" },
];

function CompanyPage() {
  const [form, setForm] = useState<Form>(empty);
  const [id, setId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();
  useEffect(() => { api.companies().then((c) => { if (c[0]) { const { id, ...rest } = c[0]; setId(id); setForm({ ...empty, ...rest }); } }); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Company name is required");
    setSaving(true);
    try {
      if (id) await api.updateCompany(id, form); else setId((await api.createCompany(form)).id);
      toast.success("Company profile saved");
      nav({ to: "/marketer" });
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Step 1</p>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold">Tell your AI marketer about your company</h1>
      <p className="mt-2 text-muted-foreground">The more context you give, the more on-brand every post will be.</p>
      <Card className="mt-8 shadow-soft border-border">
        <CardHeader><CardTitle>Company profile</CardTitle><CardDescription>You can edit this any time.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.k} className={f.area ? "sm:col-span-2 grid gap-2" : "grid gap-2"}>
                <Label htmlFor={f.k}>{f.label}</Label>
                {f.area
                  ? <Textarea id={f.k} placeholder={f.ph} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                  : <Input id={f.k} placeholder={f.ph} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />}
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" size="lg" disabled={saving}>{saving ? "Saving…" : "Save & open AI Marketer"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

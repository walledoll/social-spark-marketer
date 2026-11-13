import { Link } from "@tanstack/react-router";
import { Building2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";

const items = [
  { to: "/", label: "Company", icon: Building2 },
  { to: "/marketer", label: "AI Marketer", icon: MessageSquareText },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

export function AppNav() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen flex md:flex-col gap-1 p-3 md:p-4 sticky top-0 z-10">
      <div className="flex items-center gap-2 px-2 py-2 md:mb-6 mr-auto md:mr-0">
        <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary"><Sparkles className="size-4" /></span>
        <span className="font-display text-lg font-semibold hidden sm:block">Pulse</span>
      </div>
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} activeOptions={{ exact: true }}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium opacity-80 hover:bg-sidebar-accent hover:opacity-100 transition"
          activeProps={{ className: "bg-sidebar-accent opacity-100" }}>
          <Icon className="size-4" /><span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </aside>
  );
}

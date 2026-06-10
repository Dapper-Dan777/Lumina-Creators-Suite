import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Sparkles, MessageSquare, BarChart3,
  Wallet, UsersRound, Settings, Search, Bell, Plus, Zap, Menu, X, MoreHorizontal,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { Toaster } from "sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/creators", label: "Creators", icon: Users },
  { to: "/studio", label: "Studio", icon: Sparkles },
  { to: "/automation", label: "Automationen", icon: Zap },
  { to: "/messaging", label: "Messaging", icon: MessageSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/finance", label: "Finanzen", icon: Wallet },
  { to: "/team", label: "Team", icon: UsersRound },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const mobileNav = nav.slice(0, 4);
const moreNav = nav.slice(4);

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode; title: string; subtitle?: string; actions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const branding = useStore((s) => s.branding);
  const alertCount = useStore((s) => s.alerts.length);

  // close on route change
  useEffect(() => { setDrawerOpen(false); setMoreOpen(false); }, [path]);

  // Apply brand color globally via CSS var
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", branding.primary);
    document.documentElement.style.setProperty("--brand-accent", branding.accent);
  }, [branding]);

  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-sidebar flex-col">
        <SidebarContent branding={branding} isActive={isActive} />
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col animate-in slide-in-from-left duration-200">
            <SidebarContent branding={branding} isActive={isActive} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 lg:h-16 border-b border-border bg-background/85 backdrop-blur sticky top-0 z-30 flex items-center px-3 lg:px-6 gap-2 lg:gap-4">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden size-10 grid place-items-center rounded-lg hover:bg-elevated">
            <Menu className="size-5" />
          </button>

          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="size-8 rounded-lg grid place-items-center shadow-glow" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}>
              <Zap className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold">{branding.logoText}</span>
          </Link>

          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche…  (⌘K)"
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-elevated border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="flex-1 md:hidden" />

          <button className="relative size-10 grid place-items-center rounded-lg border border-border bg-elevated hover:bg-secondary transition" aria-label="Benachrichtigungen">
            <Bell className="size-4" />
            {alertCount > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] grid place-items-center font-bold text-white">{alertCount}</span>}
          </button>
          <div className="size-10 rounded-full bg-gradient-brand grid place-items-center text-sm font-bold shrink-0">SM</div>
        </header>

        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-4 lg:px-8 pt-5 lg:pt-8 pb-4">
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-3xl font-display font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs lg:text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>

        <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex-1">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className={`size-5 ${active ? "drop-shadow-[0_0_8px_var(--magenta)]" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
            <button onClick={() => setMoreOpen(true)}
              className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${moreNav.some((n) => isActive(n.to)) ? "text-primary" : "text-muted-foreground"}`}>
              <MoreHorizontal className="size-5" />
              Mehr
            </button>
          </div>
        </nav>

        {/* "More" sheet on mobile */}
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-0 inset-x-0 bg-sidebar rounded-t-2xl border-t border-sidebar-border p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-in slide-in-from-bottom duration-200">
              <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
              <div className="grid grid-cols-2 gap-2">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link key={item.to} to={item.to}
                      className={`flex items-center gap-3 p-4 rounded-xl border ${active ? "bg-elevated border-primary/40" : "bg-elevated/60 border-border"}`}>
                      <Icon className={`size-5 ${active ? "text-primary" : ""}`} />
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Toaster theme="dark" position="top-right" richColors closeButton />
    </div>
  );
}

function SidebarContent({ branding, isActive, onClose }: {
  branding: { primary: string; accent: string; logoText: string };
  isActive: (to: string) => boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl grid place-items-center shadow-glow" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}>
            <Zap className="size-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-none">{branding.logoText}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Manage</div>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-elevated">
            <X className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-sidebar-accent text-foreground shadow-sm border border-sidebar-border"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}>
              <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
              {item.label}
              {active && <div className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="rounded-xl p-3 bg-gradient-card border border-sidebar-border">
          <div className="text-xs text-muted-foreground mb-2">Agency Plan</div>
          <div className="font-semibold text-sm mb-2">Pro · 6/10 Creator</div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full w-3/5 rounded-full" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }} />
          </div>
        </div>
      </div>
    </>
  );
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-2xl bg-gradient-card border border-border shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, delta, accent, onClick }: {
  label: string; value: string; delta?: string; accent?: "magenta" | "cyan" | "success" | "warning"; onClick?: () => void;
}) {
  const color =
    accent === "cyan" ? "text-cyan" :
    accent === "success" ? "text-success" :
    accent === "warning" ? "text-warning" : "text-primary";
  return (
    <Card className={`p-4 lg:p-5 relative overflow-hidden ${onClick ? "cursor-pointer hover:border-primary/40 transition" : ""}`} onClick={onClick}>
      <div className="absolute -top-12 -right-12 size-32 rounded-full opacity-30 blur-3xl"
        style={{ background: `var(--${accent === "cyan" ? "cyan" : "magenta"})` }} />
      <div className="relative">
        <div className="text-[10px] lg:text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl lg:text-3xl font-display font-bold mt-1.5 lg:mt-2 truncate">{value}</div>
        {delta && <div className={`text-[10px] lg:text-xs mt-1 font-medium ${color}`}>{delta}</div>}
      </div>
    </Card>
  );
}

export function Badge({ children, tone = "default" }: {
  children: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "magenta";
}) {
  const tones = {
    default: "bg-secondary text-foreground border-border",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-cyan/15 text-cyan border-cyan/30",
    magenta: "bg-primary/15 text-primary border-primary/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] lg:text-xs font-medium border whitespace-nowrap ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Btn({ children, variant = "ghost", size = "md", onClick, type = "button", disabled, className = "", ...rest }: {
  children: ReactNode; variant?: "brand" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg";
  onClick?: (e: React.MouseEvent) => void; type?: "button" | "submit"; disabled?: boolean; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-sm" };
  const variants = {
    brand: "bg-gradient-brand text-white shadow-glow hover:opacity-90",
    ghost: "bg-elevated border border-border text-foreground hover:bg-secondary",
    outline: "border border-border bg-transparent text-foreground hover:bg-elevated",
    danger: "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25",
  };
  return (
    <button {...rest} type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full ${sizes[size]} bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg lg:text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-elevated"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</div>
        {footer && <div className="px-5 lg:px-6 py-4 border-t border-border bg-elevated/40 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="text-[11px] text-muted-foreground/70 mt-1 block">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full h-10 px-3 rounded-lg bg-elevated border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${props.className ?? ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full p-3 rounded-lg bg-elevated border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full h-10 px-3 rounded-lg bg-elevated border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${props.className ?? ""}`} />;
}

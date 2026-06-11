import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Sparkles, MessageSquare, BarChart3,
  Wallet, UsersRound, Settings, Search, Bell, Plus, Zap, Menu, X, MoreHorizontal, Radar,
  CheckCircle2, TrendingUp, FileWarning, AlertTriangle, RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useCreators } from "@/hooks/useCreators";
import { useNotifications } from "@/hooks/useNotifications";
import { Toaster, toast } from "sonner";
import { InstallAppBanner } from "@/components/InstallAppBanner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scout", label: "Scout", icon: Radar },
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

export function AppShell({ children, title, subtitle, actions, fill }: {
  children: ReactNode; title: string; subtitle?: string; actions?: ReactNode;
  /** Main area fills viewport height without page scroll (e.g. Messaging, Automation). */
  fill?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const branding = useStore((s) => s.branding);
  const { alerts, dismissAlert } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // close on route change
  useEffect(() => { setDrawerOpen(false); setMoreOpen(false); setNotifOpen(false); }, [path]);

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  // Sync branding → theme accents (neon on black + glass)
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--brand-primary", branding.primary);
    root.setProperty("--brand-accent", branding.accent);
    root.setProperty("--primary", branding.primary);
    root.setProperty("--magenta", branding.primary);
    root.setProperty("--accent", branding.accent);
    root.setProperty("--cyan", branding.accent);
    root.setProperty("--ring", branding.primary);
    root.setProperty("--gradient-brand", `linear-gradient(135deg, ${branding.primary}, ${branding.accent})`);
  }, [branding]);

  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] overflow-hidden ambient-mesh text-foreground">
      {/* Desktop Sidebar — floating rounded panel, same glass as main */}
      <aside className="relative hidden lg:flex w-[248px] shrink-0 m-3 mr-0 rounded-[1.25rem] glass-surface flex-col overflow-hidden z-10">
        <SidebarContent branding={branding} isActive={isActive} />
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] m-3 rounded-[1.25rem] glass-surface flex flex-col animate-in slide-in-from-left duration-200">
            <SidebarContent branding={branding} isActive={isActive} onClose={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden z-10 p-3 lg:pl-3 gap-4">
        {/* Floating toolbar — Apple-style rounded bar */}
        <header className="shrink-0 h-14 glass-toolbar z-30 flex items-center px-4 gap-3">
          <button onClick={() => setDrawerOpen(true)} className="lg:hidden size-10 grid place-items-center rounded-lg hover:bg-elevated">
            <Menu className="size-5" />
          </button>

          <Link to="/" className="lg:hidden flex items-center gap-2">
            <div className="size-8 rounded-lg grid place-items-center" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}>
              <Zap className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold">{branding.logoText}</span>
          </Link>

          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suche…"
              className="w-full h-10 pl-10 pr-4 rounded-xl glass-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex-1 md:hidden" />

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className={`relative size-10 grid place-items-center rounded-xl border transition glass-input ${notifOpen ? "border-primary/60 ring-1 ring-primary/30" : "hover:border-primary/30"}`}
              aria-label="Benachrichtigungen"
              aria-expanded={notifOpen}
            >
              <Bell className="size-4" />
              {alerts.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] grid place-items-center font-bold text-white">
                  {alerts.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl glass-strong z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-display font-semibold text-sm">Benachrichtigungen</span>
                  {alerts.length > 0 && <Badge tone="danger">{alerts.length}</Badge>}
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {alerts.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-8 text-center">Keine offenen Benachrichtigungen</div>
                  ) : (
                    alerts.map((a) => {
                      const Icon = a.type === "approval" ? CheckCircle2 : a.type === "goal" ? TrendingUp : a.type === "contract" ? FileWarning : AlertTriangle;
                      const tone = a.severity === "high" ? "danger" : a.severity === "medium" ? "warning" : "info";
                      return (
                        <div key={a.id} className="group flex gap-3 p-3 rounded-lg hover:bg-elevated/60 transition">
                          <div className={`size-8 shrink-0 rounded-lg grid place-items-center ${tone === "danger" ? "bg-destructive/15 text-destructive" : tone === "warning" ? "bg-warning/15 text-warning" : "bg-cyan/15 text-cyan"}`}>
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium leading-tight">{a.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.description}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { dismissAlert(a.id); toast.success("Erledigt"); }}
                            className="opacity-0 group-hover:opacity-100 size-7 grid place-items-center rounded hover:bg-elevated transition shrink-0"
                            aria-label="Schließen"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-border">
                  <Link to="/" onClick={() => setNotifOpen(false)} className="text-xs text-primary hover:underline">
                    Alle Alerts im Dashboard →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page header — plain text, clear gap to content below */}
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-1 lg:px-2">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-display font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs lg:text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>

        <main
          className={`flex-1 min-h-0 px-1 lg:px-2 ${
            fill
              ? "pb-0 overflow-hidden flex flex-col"
              : "pt-2 pb-24 lg:pb-2 overflow-y-auto overscroll-contain"
          }`}
        >
          {children}
        </main>

        {/* Mobile bottom nav — floating pill */}
        <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 glass-toolbar pb-[env(safe-area-inset-bottom)]">
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
            <div className="absolute bottom-0 inset-x-0 glass-strong rounded-t-3xl border-t p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] animate-in slide-in-from-bottom duration-200">
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

      <InstallAppBanner />
      <Toaster theme="dark" position="top-right" richColors closeButton />
    </div>
  );
}

function SidebarContent({ branding, isActive, onClose }: {
  branding: { primary: string; accent: string; logoText: string; logoUrl?: string; headerBgUrl?: string; profileImageUrl?: string; name?: string };
  isActive: (to: string) => boolean;
  onClose?: () => void;
}) {
  const { data: creators = [] } = useCreators();
  const activeCount = creators.filter((c) => c.status === "active").length;
  const planLimit = 10;
  const usagePct = planLimit > 0 ? Math.min(100, Math.round((creators.length / planLimit) * 100)) : 0;

  return (
    <>
      <div
        className="p-4 border-b border-border flex items-center justify-between relative overflow-hidden"
        style={branding.headerBgUrl ? { backgroundImage: `url(${branding.headerBgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        {branding.headerBgUrl && <div className="absolute inset-0 bg-black/55" />}
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="size-9 rounded-xl object-cover" />
          ) : (
            <div className="size-9 rounded-xl grid place-items-center" style={{ background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }}>
              <Zap className="size-5 text-white" strokeWidth={2.5} />
            </div>
          )}
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

      <nav className="flex-1 min-h-0 p-2.5 space-y-0.5 overflow-y-auto overscroll-contain">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}>
              <Icon className={`size-4 ${active ? "text-primary" : ""}`} />
              {item.label}
              {active && <div className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-border">
        <div className="rounded-xl p-3 bg-white/5 border border-border">
          <div className="flex items-center gap-2.5 mb-2">
            {branding.profileImageUrl ? (
              <img src={branding.profileImageUrl} alt="" className="size-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="size-8 rounded-full bg-gradient-brand grid place-items-center text-white text-[10px] font-bold shrink-0">
                {(branding.name ?? "A").charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Agency Plan</div>
              <div className="font-semibold text-sm truncate">{branding.name ?? "Agency"}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Pro · {creators.length}/{planLimit} Creator
            {activeCount > 0 && <span> · {activeCount} aktiv</span>}
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: `linear-gradient(135deg, ${branding.primary}, ${branding.accent})` }} />
          </div>
        </div>
      </div>
    </>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-8 text-center border-destructive/30 bg-destructive/5">
      <AlertTriangle className="size-8 text-destructive mx-auto mb-3" />
      <div className="font-medium mb-1">{title}</div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <Btn variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" /> Erneut laden
        </Btn>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-10 text-center">
      <div className="font-display font-semibold text-lg mb-2">{title}</div>
      <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">{message}</p>
      {action}
    </Card>
  );
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`glass-card ${className}`}>
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
      <div className="absolute -top-12 -right-12 size-32 rounded-full opacity-15 blur-3xl"
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
    default: "bg-white/[0.06] text-foreground border-border",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-cyan/15 text-cyan border-cyan/35",
    magenta: "bg-primary/15 text-primary border-primary/35",
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
    brand: "bg-gradient-brand text-white hover:brightness-110",
    ghost: "glass-input text-foreground hover:border-primary/35",
    outline: "border border-white/15 bg-transparent text-foreground hover:glass-input",
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
        className={`w-full ${sizes[size]} glass-strong rounded-t-3xl sm:rounded-3xl max-h-[92dvh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg lg:text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-elevated"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</div>
        {footer && <div className="px-5 lg:px-6 py-4 border-t border-white/10 glass-input flex gap-2 justify-end">{footer}</div>}
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
  return <input {...props} className={`w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${props.className ?? ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full p-3 rounded-xl glass-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${props.className ?? ""}`} />;
}

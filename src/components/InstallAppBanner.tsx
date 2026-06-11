import { useEffect, useState } from "react";
import { X, Smartphone, Share } from "lucide-react";
import { isIosSafari, isStandalonePwa, isNativeApp } from "@/lib/nativeApp";

const DISMISS_KEY = "lumina-install-dismissed";

export function InstallAppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isNativeApp() || isStandalonePwa()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isIosSafari()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] inset-x-3 z-40 lg:hidden animate-in slide-in-from-bottom duration-300">
      <div className="glass-strong rounded-2xl border border-primary/30 p-4 shadow-glow">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, "1");
            setVisible(false);
          }}
          className="absolute top-3 right-3 size-7 grid place-items-center rounded-lg hover:bg-elevated text-muted-foreground"
          aria-label="Schließen"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center shrink-0">
            <Smartphone className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm">Als App installieren</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Tippe <Share className="size-3 inline -mt-0.5" /> <strong className="text-foreground">Teilen</strong> →{" "}
              <strong className="text-foreground">Zum Home-Bildschirm</strong> — dann öffnet Lumina wie eine native App.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
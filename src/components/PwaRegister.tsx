import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

export function PwaRegister() {
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const update = registerSW({
      onRegisteredSW() {
        // Service worker ready
      },
      onOfflineReady() {
        // Shell cached for faster loads
      },
    });
    return () => {
      void update;
    };
  }, []);
  return null;
}
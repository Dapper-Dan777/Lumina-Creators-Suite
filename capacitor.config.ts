import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Lumina als native iOS-App (Capacitor WebView).
 * Die App lädt deinen deployed Server — SSR + API bleiben unverändert.
 *
 * Dev (iPhone im WLAN): CAPACITOR_SERVER_URL=http://192.168.x.x:8081
 * Prod (HTTPS):         CAPACITOR_SERVER_URL=https://deine-domain.com
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.lumina.manage",
  appName: "Lumina Manage",
  webDir: ".output/public",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        androidScheme: "https",
      }
    : undefined,
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: "#0a0a0f",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0f",
    },
  },
};

export default config;
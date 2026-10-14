import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { decodeShareLink } from "./share";
import { toVCard } from "./vcard";

// Public address of the web app. Links made inside the Android app point here,
// so a phone without the app opens the card in its browser.
export const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_SHARE_ORIGIN ?? "https://tapkonek.vercel.app";

export type NativeNfcStatus = { supported: boolean; enabled: boolean; canSend: boolean };

type TagEvent = { url?: string; vcard?: string; error?: string };

interface TapNfcPlugin {
  isAvailable(): Promise<NativeNfcStatus>;
  openSettings(): Promise<void>;
  startSharing(options: { url: string }): Promise<void>;
  stopSharing(): Promise<void>;
  startReading(): Promise<void>;
  stopReading(): Promise<void>;
  addListener(event: "sent", cb: () => void): Promise<PluginListenerHandle>;
  addListener(event: "tag", cb: (data: TagEvent) => void): Promise<PluginListenerHandle>;
}

const TapNfc = registerPlugin<TapNfcPlugin>("TapNfc");

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export const nativeNfc = {
  status: () => TapNfc.isAvailable(),
  openSettings: () => TapNfc.openSettings(),

  async startSharing(url: string, onSent: () => void): Promise<() => Promise<void>> {
    const handle = await TapNfc.addListener("sent", onSent);
    try {
      await TapNfc.startSharing({ url });
    } catch (error) {
      await handle.remove();
      throw error;
    }
    return async () => {
      await handle.remove();
      await TapNfc.stopSharing();
    };
  },

  async startReading(
    onCard: (vcard: string) => void,
    onError: (message: string) => void,
  ): Promise<() => Promise<void>> {
    const handle = await TapNfc.addListener("tag", (data) => {
      if (data.vcard) return onCard(data.vcard);
      const fields = data.url ? decodeShareLink(data.url) : null;
      if (fields) return onCard(toVCard(fields));
      onError(data.error ?? "That tag did not contain a contact card.");
    });
    try {
      await TapNfc.startReading();
    } catch (error) {
      await handle.remove();
      throw error;
    }
    return async () => {
      await handle.remove();
      await TapNfc.stopReading();
    };
  },
};

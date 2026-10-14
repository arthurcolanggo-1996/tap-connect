import { decodeShareLink } from "./share";
import { toVCard } from "./vcard";

export type NfcCapability = {
  supported: boolean;
  secureContext: boolean;
  reason?: string;
  // Set when the user could fix things by switching to Chrome.
  openInChromeUrl?: string;
};

function chromeIntentUrl(): string {
  const { host, pathname, search, hash } = window.location;
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=com.android.chrome;end`;
}

export function getNfcCapability(): NfcCapability {
  if (typeof window === "undefined") {
    return { supported: false, secureContext: false, reason: "NFC is only available on a phone." };
  }
  const secureContext = window.isSecureContext;
  if (typeof window.NDEFReader === "function") {
    if (!secureContext) {
      return { supported: false, secureContext, reason: "NFC needs a secure (https) page." };
    }
    return { supported: true, secureContext };
  }

  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const inApp = /; wv\)|FBAN|FBAV|Instagram|Line\/|Messenger|Snapchat|TikTok|WhatsApp|Telegram/i.test(ua);
  const notChrome = /SamsungBrowser|Firefox|OPR\/|Opera|EdgA|DuckDuckGo|MiuiBrowser|UCBrowser/i.test(ua);

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return {
      supported: false,
      secureContext,
      reason: "iPhones can’t use NFC from a web app. Use the QR code or share link.",
    };
  }
  if (android && (inApp || notChrome)) {
    return {
      supported: false,
      secureContext,
      reason: inApp
        ? "This in-app browser blocks NFC. Open the link in Chrome."
        : "This browser doesn’t support NFC. Open the app in Chrome.",
      openInChromeUrl: chromeIntentUrl(),
    };
  }
  if (android) {
    return {
      supported: false,
      secureContext,
      reason: "NFC isn’t available in this browser. Update Chrome, or use the QR code or share link.",
      openInChromeUrl: chromeIntentUrl(),
    };
  }
  return {
    supported: false,
    secureContext,
    reason: "NFC works in Chrome on Android. Use the QR code or share link here.",
  };
}

function decodeRecord(data?: DataView, encoding = "utf-8"): string {
  if (!data) return "";
  try {
    return new TextDecoder(encoding || "utf-8").decode(data);
  } catch {
    return new TextDecoder().decode(data);
  }
}

export function payloadFromNdef(event: NDEFReadingEvent): string | null {
  for (const record of event.message.records) {
    const body = decodeRecord(record.data, record.encoding);
    if (!body) continue;
    if (body.includes("BEGIN:VCARD")) return body;
    if (record.recordType === "url" || record.recordType === "absolute-url" || body.includes("/receive#")) {
      const fields = decodeShareLink(body);
      if (fields) return toVCard(fields);
    }
  }
  return null;
}

// Writes a link, not raw contact data. Any phone that taps the tag opens the
// link in its browser, so the receiver does not need the app.
export async function writeLinkToNfc(link: string, signal?: AbortSignal): Promise<void> {
  if (!window.NDEFReader) throw new Error("NFC is not available on this device.");
  const reader = new window.NDEFReader();
  await reader.write({ records: [{ recordType: "url", data: link }] }, { signal });
}

export async function scanNfc(
  onPayload: (vcard: string) => void,
  onError: (message: string) => void,
  signal: AbortSignal,
): Promise<void> {
  if (!window.NDEFReader) throw new Error("NFC is not available on this device.");
  const reader = new window.NDEFReader();
  const handle = (event: NDEFReadingEvent) => {
    const payload = payloadFromNdef(event);
    if (payload) onPayload(payload);
    else onError("That tag did not contain a contact card.");
  };
  reader.addEventListener("reading", handle);
  reader.addEventListener("readingerror", () => onError("Couldn’t read that tag. Try again."));
  try {
    await reader.scan({ signal });
  } finally {
    reader.removeEventListener("reading", handle);
  }
}

export function nfcErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong with NFC.";
  switch (error.name) {
    case "AbortError":
      return "Cancelled.";
    case "NotAllowedError":
      return "NFC is blocked. Turn NFC on in phone settings, and allow NFC for this site in Chrome (lock icon > Permissions).";
    case "NotSupportedError":
      return "NFC is off or not supported on this phone. Turn it on in settings.";
    case "NotReadableError":
      return "Couldn’t read that. Hold the phone still against the tag and try again.";
    case "NetworkError":
      return "The tag moved away too soon. Hold it steady and try again.";
    case "InvalidStateError":
      return "NFC is busy. Close other NFC apps and try again.";
    case "SecurityError":
      return "NFC needs this page to be open directly in Chrome, not inside another app or frame.";
    case "TypeError":
      return "Couldn’t write this card. Share fewer fields, or use the QR code.";
    default:
      return error.message || "Something went wrong with NFC.";
  }
}

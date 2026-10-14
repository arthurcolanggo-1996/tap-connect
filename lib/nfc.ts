export type NfcCapability = {
  supported: boolean;
  secureContext: boolean;
  reason?: string;
};

export function getNfcCapability(): NfcCapability {
  if (typeof window === "undefined") {
    return { supported: false, secureContext: false, reason: "NFC is only available on a phone." };
  }
  const secureContext = window.isSecureContext;
  const supported = typeof window.NDEFReader === "function";
  if (!supported) {
    return {
      supported: false,
      secureContext,
      reason: "Web NFC is available in Chrome on Android. Use QR or system share on this device.",
    };
  }
  if (!secureContext) {
    return {
      supported: false,
      secureContext,
      reason: "NFC requires HTTPS (or localhost).",
    };
  }
  return { supported: true, secureContext };
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
    if (record.mediaType === "text/vcard" || record.mediaType === "text/x-vcard") return body;
    if (record.recordType === "text" && body.includes("BEGIN:VCARD")) return body;
    if (body.includes("BEGIN:VCARD")) return body;
  }
  return null;
}

export async function writeVCardToNfc(vcard: string, signal?: AbortSignal): Promise<void> {
  if (!window.NDEFReader) throw new Error("NFC is not available on this device.");
  const reader = new window.NDEFReader();
  await reader.write(
    {
      records: [
        { recordType: "mime", mediaType: "text/vcard", data: vcard },
        { recordType: "text", data: vcard },
      ],
    },
    { signal },
  );
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
  if (error.name === "AbortError") return "Tap cancelled.";
  if (error.name === "NotAllowedError") return "NFC permission was denied.";
  if (error.name === "NotSupportedError") return "NFC is not supported on this device.";
  if (error.name === "NotReadableError") return "The tag couldn’t be read. Hold still and try again.";
  if (error.name === "NetworkError") return "The connection dropped. Keep the phones together.";
  return error.message || "Something went wrong with NFC.";
}

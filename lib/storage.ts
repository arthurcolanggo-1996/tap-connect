import { DEFAULT_SHARE_PREFS, EMPTY_PROFILE, type Profile, type ReceivedCard, type SharePrefs } from "./types";
import { sanitizeProfile, sanitizeSharePrefs } from "./validation";

const PROFILE_KEY = "tapconnect.profile.v1";
const PREFS_KEY = "tapconnect.prefs.v1";
const INBOX_KEY = "tapconnect.inbox.v1";
const MAX_INBOX = 80;

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfile(): Profile {
  return sanitizeProfile(readJson(PROFILE_KEY) ?? EMPTY_PROFILE);
}

export function saveProfile(profile: Profile): void {
  writeJson(PROFILE_KEY, sanitizeProfile(profile));
}

export function loadSharePrefs(): SharePrefs {
  return sanitizeSharePrefs(readJson(PREFS_KEY)) ?? { ...DEFAULT_SHARE_PREFS };
}

export function saveSharePrefs(prefs: SharePrefs): void {
  writeJson(PREFS_KEY, prefs);
}

export function loadInbox(): ReceivedCard[] {
  const raw = readJson(INBOX_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is ReceivedCard => {
      return (
        !!item &&
        typeof item === "object" &&
        typeof (item as ReceivedCard).id === "string" &&
        typeof (item as ReceivedCard).vcard === "string" &&
        typeof (item as ReceivedCard).displayName === "string"
      );
    })
    .slice(0, MAX_INBOX);
}

export function saveInbox(items: ReceivedCard[]): void {
  writeJson(INBOX_KEY, items.slice(0, MAX_INBOX));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

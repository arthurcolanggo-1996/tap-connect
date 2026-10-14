import { FIELD_KEYS, type FieldKey, type Profile } from "./types";
import { sanitizeProfile } from "./validation";

// Short keys keep the link (and its QR code) small.
const KEYS: Record<FieldKey, string> = {
  firstName: "f",
  lastName: "l",
  role: "r",
  company: "c",
  phone: "p",
  email: "e",
  website: "w",
  linkedin: "i",
};

// Data lives in the URL fragment, so it is never sent to a server.
export function encodeShareLink(fields: Partial<Profile>, origin: string): string {
  const params = new URLSearchParams();
  for (const key of FIELD_KEYS) {
    const value = fields[key];
    if (value) params.set(KEYS[key], value);
  }
  return `${origin}/receive#${params.toString()}`;
}

// Accepts a full link or just the "#..." fragment. Returns null if no card is inside.
export function decodeShareLink(input: string): Partial<Profile> | null {
  const hashIndex = input.indexOf("#");
  const fragment = hashIndex === -1 ? input : input.slice(hashIndex + 1);
  if (!fragment || fragment.length > 4000) return null;
  const params = new URLSearchParams(fragment);
  const raw: Record<string, string> = {};
  let found = false;
  for (const key of FIELD_KEYS) {
    const value = params.get(KEYS[key]);
    if (value) {
      raw[key] = value;
      found = true;
    }
  }
  if (!found) return null;
  const profile = sanitizeProfile(raw);
  return profile.firstName || profile.lastName || profile.company || profile.email ? profile : null;
}

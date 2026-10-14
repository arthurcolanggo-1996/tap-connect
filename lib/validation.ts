import { EMPTY_PROFILE, FIELD_KEYS, type FieldKey, type Profile, type SharePrefs } from "./types";

const LIMITS: Record<FieldKey, number> = {
  firstName: 40,
  lastName: 40,
  role: 80,
  company: 80,
  phone: 24,
  email: 120,
  website: 200,
  linkedin: 200,
};

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function isValidEmail(value: string): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes("..");
}

export function isValidPhone(value: string): boolean {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return /^\+?[0-9\s().-]{7,24}$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export function isValidHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeUrl(value: string): string {
  const trimmed = sanitizeText(value, LIMITS.website);
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function normalizeLinkedIn(value: string): string {
  const trimmed = sanitizeText(value, LIMITS.linkedin);
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^linkedin\.com\//i.test(trimmed)) return `https://${trimmed}`;
  if (/^[\w-]+$/.test(trimmed)) return `https://www.linkedin.com/in/${trimmed}`;
  return trimmed;
}

export type FieldErrors = Partial<Record<FieldKey, string>>;

export function sanitizeProfile(input: unknown): Profile {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const profile = { ...EMPTY_PROFILE };
  for (const key of FIELD_KEYS) {
    profile[key] = sanitizeText(raw[key], LIMITS[key]);
  }
  profile.website = normalizeUrl(profile.website);
  profile.linkedin = normalizeLinkedIn(profile.linkedin);
  return profile;
}

export function validateProfile(profile: Profile): FieldErrors {
  const errors: FieldErrors = {};
  if (!profile.firstName && !profile.lastName) {
    errors.firstName = "Add a first or last name";
  }
  if (!isValidEmail(profile.email)) errors.email = "Enter a valid email";
  if (!isValidPhone(profile.phone)) errors.phone = "Enter a valid phone number";
  if (profile.website && !isValidHttpUrl(profile.website)) errors.website = "Enter a valid URL";
  if (profile.linkedin && !isValidHttpUrl(profile.linkedin)) errors.linkedin = "Enter a valid LinkedIn URL";
  return errors;
}

export function sanitizeSharePrefs(input: unknown): SharePrefs | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const prefs = {} as SharePrefs;
  for (const key of FIELD_KEYS) {
    prefs[key] = raw[key] === true;
  }
  return prefs;
}

export function displayNameFrom(fields: Partial<Profile>): string {
  const name = [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim();
  return name || fields.company || fields.email || "Untitled contact";
}

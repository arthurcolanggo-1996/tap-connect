import { FIELD_KEYS, type FieldKey, type Profile, type SharePrefs } from "./types";
import { displayNameFrom, sanitizeProfile } from "./validation";

function fold(line: string): string {
  return line.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export function selectFields(profile: Profile, prefs: SharePrefs): Partial<Profile> {
  const selected: Partial<Profile> = {};
  for (const key of FIELD_KEYS) {
    if (prefs[key] && profile[key]) selected[key] = profile[key];
  }
  return selected;
}

export function toVCard(fields: Partial<Profile>): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const last = fold(fields.lastName ?? "");
  const first = fold(fields.firstName ?? "");
  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${fold(displayNameFrom(fields))}`);
  if (fields.company) lines.push(`ORG:${fold(fields.company)}`);
  if (fields.role) lines.push(`TITLE:${fold(fields.role)}`);
  if (fields.phone) lines.push(`TEL;TYPE=CELL:${fold(fields.phone)}`);
  if (fields.email) lines.push(`EMAIL;TYPE=INTERNET:${fold(fields.email)}`);
  if (fields.website) lines.push(`URL:${fold(fields.website)}`);
  if (fields.linkedin) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${fold(fields.linkedin)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

function unfold(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\").trim();
}

export function fromVCard(raw: string): Partial<Profile> {
  const text = raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const fields: Partial<Profile> = {};
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyPart = line.slice(0, idx).toUpperCase();
    const value = unfold(line.slice(idx + 1));
    const name = keyPart.split(";")[0];
    if (name === "FN" && !fields.firstName && !fields.lastName) {
      const parts = value.split(" ");
      fields.firstName = parts[0] ?? "";
      fields.lastName = parts.slice(1).join(" ");
    } else if (name === "N") {
      const [last, first] = value.split(";");
      if (last) fields.lastName = last;
      if (first) fields.firstName = first;
    } else if (name === "ORG") fields.company = value.split(";")[0];
    else if (name === "TITLE") fields.role = value;
    else if (name === "TEL") fields.phone = value;
    else if (name === "EMAIL") fields.email = value;
    else if (name === "URL") fields.website = value;
    else if (keyPart.includes("LINKEDIN")) fields.linkedin = value;
  }
  return sanitizeProfile(fields);
}

export function sharedFieldCount(profile: Profile, prefs: SharePrefs): number {
  return FIELD_KEYS.filter((key: FieldKey) => prefs[key] && profile[key]).length;
}

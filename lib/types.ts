export const FIELD_KEYS = [
  "firstName",
  "lastName",
  "role",
  "company",
  "phone",
  "email",
  "website",
  "linkedin",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type Profile = Record<FieldKey, string>;

export type SharePrefs = Record<FieldKey, boolean>;

export type ReceivedCard = {
  id: string;
  receivedAt: string;
  displayName: string;
  source: "nfc" | "import" | "link" | "manual";
  fields: Partial<Profile>;
  vcard: string;
};

export const FIELD_LABELS: Record<FieldKey, string> = {
  firstName: "First name",
  lastName: "Last name",
  role: "Title",
  company: "Company",
  phone: "Phone",
  email: "Email",
  website: "Website",
  linkedin: "LinkedIn",
};

export const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  role: "",
  company: "",
  phone: "",
  email: "",
  website: "",
  linkedin: "",
};

export const DEFAULT_SHARE_PREFS: SharePrefs = {
  firstName: true,
  lastName: true,
  role: false,
  company: false,
  phone: true,
  email: true,
  website: false,
  linkedin: false,
};

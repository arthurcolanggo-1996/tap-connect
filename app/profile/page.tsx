"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useLocalStore } from "@/hooks/useLocalStore";
import { EMPTY_PROFILE, FIELD_KEYS, FIELD_LABELS, type FieldKey, type Profile } from "@/lib/types";
import { sanitizeProfile, validateProfile } from "@/lib/validation";

const PLACEHOLDERS: Record<FieldKey, string> = {
  firstName: "Ada",
  lastName: "Lovelace",
  role: "Product engineer",
  company: "Tap Connect",
  phone: "+1 415 555 0199",
  email: "ada@example.com",
  website: "https://example.com",
  linkedin: "linkedin.com/in/ada",
};

export default function ProfilePage() {
  const router = useRouter();
  const { ready, profile, updateProfile } = useLocalStore();
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (ready) setDraft(profile);
  }, [ready, profile]);

  function onChange(key: FieldKey, value: string) {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function onSave() {
    const next = sanitizeProfile(draft);
    const nextErrors = validateProfile(next);
    setDraft(next);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    updateProfile(next);
    setSaved(true);
    window.setTimeout(() => router.push("/"), 500);
  }

  function onReset() {
    updateProfile(EMPTY_PROFILE);
    setDraft(EMPTY_PROFILE);
    setConfirmReset(false);
    setSaved(false);
  }

  if (!ready) return <h1>Loading</h1>;

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="kicker">Profile</p>
          <h1>Details</h1>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => router.push("/")}>
          Done
        </button>
      </header>

      <p className="muted" style={{ marginTop: -8, marginBottom: 16 }}>
        Stored only on this device. Sharing still respects the field toggles on the Share tab.
      </p>

      <div className="group">
        {FIELD_KEYS.map((key) => (
          <label className="field" key={key}>
            <span>{FIELD_LABELS[key]}</span>
            <input
              value={draft[key]}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={PLACEHOLDERS[key]}
              autoComplete={key === "email" ? "email" : key === "phone" ? "tel" : "off"}
              inputMode={key === "phone" ? "tel" : key === "email" ? "email" : "text"}
            />
            {errors[key] ? <span className="error">{errors[key]}</span> : null}
          </label>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <button className="btn btn-primary" type="button" onClick={onSave}>
          {saved ? "Saved" : "Save profile"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => setConfirmReset(true)}>
          Clear profile
        </button>
      </div>

      <ConfirmModal
        open={confirmReset}
        title="Clear this profile?"
        body="Your name and contact fields will be removed from this device. Received cards in Inbox are kept."
        confirmLabel="Clear profile"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={onReset}
      />
    </section>
  );
}

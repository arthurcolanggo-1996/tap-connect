"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocalStore } from "@/hooks/useLocalStore";
import { displayNameFrom } from "@/lib/validation";

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "T") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function CardPage() {
  const { ready, profile } = useLocalStore();
  const name = displayNameFrom(profile);
  const subtitle = [profile.role, profile.company].filter(Boolean).join(" · ");
  const chips = useMemo(
    () =>
      [profile.phone, profile.email, profile.website, profile.linkedin].filter(Boolean) as string[],
    [profile],
  );
  const complete = Boolean(profile.firstName || profile.lastName);

  if (!ready) {
    return (
      <section>
        <p className="kicker">Tap Connect</p>
        <h1>Loading</h1>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="kicker">Tap Connect</p>
          <h1>Your card</h1>
        </div>
        <Link href="/profile" className="btn btn-ghost">
          Edit
        </Link>
      </header>

      <div className="hero-card card">
        <div className="avatar" aria-hidden="true">
          {initials(complete ? name : "TC")}
        </div>
        <p className="hero-name">{complete ? name : "Add your details"}</p>
        <p className="hero-meta">
          {complete ? subtitle || "Ready to share a lean card" : "Name, phone, email — only what you choose"}
        </p>
        {chips.length ? (
          <div className="chip-row">
            {chips.slice(0, 3).map((chip) => (
              <span className="chip" key={chip}>
                {chip.replace(/^https?:\/\//, "")}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        <Link href="/share" className="btn btn-primary" style={{ width: "100%" }}>
          Share with a tap
        </Link>
        {!complete ? (
          <Link href="/profile" className="btn btn-secondary" style={{ width: "100%" }}>
            Set up profile
          </Link>
        ) : null}
        <p className="muted">
          Nothing leaves this phone until you share. Choose fields each time so a tap never sends more
          than you meant.
        </p>
      </div>
    </section>
  );
}

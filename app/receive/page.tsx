"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocalStore } from "@/hooks/useLocalStore";
import { decodeShareLink } from "@/lib/share";
import { newId } from "@/lib/storage";
import { FIELD_LABELS, type FieldKey, type Profile } from "@/lib/types";
import { toVCard } from "@/lib/vcard";
import { displayNameFrom } from "@/lib/validation";

export default function ReceivePage() {
  const { inbox, updateInbox } = useLocalStore();
  const [fields, setFields] = useState<Partial<Profile> | null>(null);
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFields(decodeShareLink(window.location.hash));
    setChecked(true);
  }, []);

  if (!checked) return <h1>Loading</h1>;

  if (!fields) {
    return (
      <section>
        <header className="page-header">
          <div>
            <p className="kicker">Receive</p>
            <h1>No card found</h1>
          </div>
        </header>
        <p className="status warn">
          This link is empty or damaged. Ask the sender to show the QR code or tap the tag again.
        </p>
      </section>
    );
  }

  const vcard = toVCard(fields);
  const name = displayNameFrom(fields);

  function download() {
    const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function addToInbox() {
    if (!saved) {
      updateInbox([
        {
          id: newId(),
          receivedAt: new Date().toISOString(),
          displayName: name,
          source: "link",
          fields: fields ?? {},
          vcard,
        },
        ...inbox.filter((item) => item.vcard !== vcard),
      ]);
    }
    setSaved(true);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="kicker">Received</p>
          <h1>{name}</h1>
        </div>
      </header>
      <div className="group" style={{ marginBottom: 16 }}>
        {(Object.entries(fields) as [FieldKey, string][])
          .filter(([, value]) => Boolean(value))
          .map(([key, value]) => (
            <div className="row" key={key}>
              <span className="row-label">
                <small>{FIELD_LABELS[key]}</small>
                {value}
              </span>
            </div>
          ))}
      </div>
      <div className="stack">
        <button className="btn btn-primary" type="button" onClick={download}>
          Save to contacts
        </button>
        <button className="btn btn-secondary" type="button" onClick={addToInbox} disabled={saved}>
          {saved ? "Added to Inbox" : "Add to Inbox"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Save to contacts downloads a card your phone’s Contacts app can open.{" "}
        <Link href="/">Make your own card</Link>
      </p>
    </section>
  );
}

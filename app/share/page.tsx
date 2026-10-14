"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QrCanvas } from "@/components/QrCanvas";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useLocalStore } from "@/hooks/useLocalStore";
import { getNfcCapability, nfcErrorMessage, writeLinkToNfc, type NfcCapability } from "@/lib/nfc";
import { FIELD_KEYS, FIELD_LABELS, type FieldKey } from "@/lib/types";
import { encodeShareLink } from "@/lib/share";
import { selectFields, sharedFieldCount, toVCard } from "@/lib/vcard";
import { displayNameFrom } from "@/lib/validation";

type Status = { kind: "ok" | "warn" | "err"; text: string } | null;

export default function SharePage() {
  const { ready, profile, prefs, updatePrefs } = useLocalStore();
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [nfc, setNfc] = useState<NfcCapability>({ supported: false, secureContext: false });
  const abortRef = useRef<AbortController | null>(null);

  const selected = useMemo(() => selectFields(profile, prefs), [profile, prefs]);
  const vcard = useMemo(() => toVCard(selected), [selected]);
  const [origin, setOrigin] = useState("");
  const link = useMemo(() => (origin ? encodeShareLink(selected, origin) : ""), [selected, origin]);
  const count = sharedFieldCount(profile, prefs);
  const named = Boolean(profile.firstName || profile.lastName);

  useEffect(() => {
    setNfc(getNfcCapability());
    setOrigin(window.location.origin);
    return () => abortRef.current?.abort();
  }, []);

  function toggle(key: FieldKey) {
    updatePrefs({ ...prefs, [key]: !prefs[key] });
  }

  async function startWrite() {
    setConfirmWrite(false);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setStatus({ kind: "warn", text: "Hold the back of this phone against the NFC tag…" });
    try {
      await writeLinkToNfc(link, controller.signal);
      navigator.vibrate?.(20);
      setStatus({ kind: "ok", text: "Written. Anyone who taps this tag opens your card." });
    } catch (error) {
      setStatus({ kind: "err", text: nfcErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function systemShare() {
    const blob = new Blob([vcard], { type: "text/vcard" });
    const file = new File([blob], `${displayNameFrom(selected) || "contact"}.vcf`, {
      type: "text/vcard",
    });
    try {
      if (navigator.share) {
        const payload: ShareData = { title: displayNameFrom(selected), text: "My contact card", url: link };
        if (navigator.canShare?.({ files: [file] })) payload.files = [file];
        await navigator.share(payload);
        setStatus({ kind: "ok", text: "Opened the system share sheet." });
        return;
      }
      await navigator.clipboard.writeText(link);
      setStatus({ kind: "ok", text: "Link copied. Paste it into a message." });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus({ kind: "err", text: "Couldn’t open share. Try QR instead." });
    }
  }

  function downloadVcf() {
    const url = URL.createObjectURL(new Blob([vcard], { type: "text/vcard" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${displayNameFrom(selected) || "contact"}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <h1>Loading</h1>;

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="kicker">Share</p>
          <h1>Share your card</h1>
        </div>
      </header>

      {!named ? (
        <p className="status warn" style={{ marginBottom: 16 }}>
          Add a name on your <Link href="/profile">profile</Link> before sharing.
        </p>
      ) : null}

      <div className="card nfc-stage" style={{ marginBottom: 16 }}>
        <div className="rings" aria-hidden="true">
          <i />
          <i />
          <i />
          <b>◎</b>
        </div>
        <h2 style={{ margin: "0 0 6px", letterSpacing: "-0.04em" }}>
          {count} field{count === 1 ? "" : "s"} selected
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Show the QR code below. The other person scans it with their camera and your card opens in
          their browser. They don’t need the app.
        </p>
        {!nfc.supported && nfc.reason ? <p className="status warn">{nfc.reason}</p> : null}
        {!nfc.supported && nfc.openInChromeUrl ? (
          <a className="btn btn-secondary" href={nfc.openInChromeUrl} style={{ marginTop: 8 }}>
            Open in Chrome
          </a>
        ) : null}
        {status ? <p className={`status ${status.kind}`}>{status.text}</p> : null}
        <div className="stack" style={{ marginTop: 16 }}>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!named || count === 0 || busy}
            onClick={() => {
              if (!nfc.supported) {
                setShowQr(true);
                return;
              }
              setConfirmWrite(true);
            }}
          >
            {busy ? "Waiting for tag…" : nfc.supported ? "Write to NFC tag" : "Show QR code"}
          </button>
          {busy ? (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel tap
            </button>
          ) : null}
        </div>
      </div>

      <p className="muted" style={{ marginBottom: 8 }}>
        Only toggled fields go into the QR code, NFC tag, or link.
      </p>
      <div className="group" style={{ marginBottom: 16 }}>
        {FIELD_KEYS.map((key) => (
          <label className="row" key={key}>
            <span className="row-label">
              {FIELD_LABELS[key]}
              <small>{profile[key] || "Empty — won’t be sent"}</small>
            </span>
            <span className="switch">
              <input
                type="checkbox"
                checked={prefs[key]}
                disabled={!profile[key]}
                onChange={() => toggle(key)}
              />
              <span />
            </span>
          </label>
        ))}
      </div>

      <div className="btn-row">
        <button className="btn btn-secondary" type="button" onClick={() => setShowQr((v) => !v)}>
          {showQr ? "Hide QR" : "Show QR"}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => void systemShare()} disabled={!named || count === 0}>
          Share link
        </button>
      </div>
      <button
        className="btn btn-ghost"
        type="button"
        style={{ width: "100%", marginTop: 8 }}
        onClick={downloadVcf}
        disabled={!named || count === 0}
      >
        Download .vcf
      </button>

      {showQr && named && count > 0 && link ? (
        <div className="card" style={{ marginTop: 12 }}>
          <QrCanvas value={link} />
          <p className="muted" style={{ textAlign: "center", padding: "0 16px 16px" }}>
            Works with any phone camera. No app or NFC needed.
          </p>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmWrite}
        title="Write your card to an NFC tag?"
        body="Hold this phone against a blank or rewritable NFC tag. The tag’s old contents will be replaced. Anyone who taps the tag opens your card in their browser."
        confirmLabel="Hold to share"
        onCancel={() => setConfirmWrite(false)}
        onConfirm={() => void startWrite()}
      />
    </section>
  );
}

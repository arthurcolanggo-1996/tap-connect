"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useLocalStore } from "@/hooks/useLocalStore";
import { getNfcCapability, nfcErrorMessage, scanNfc } from "@/lib/nfc";
import { newId } from "@/lib/storage";
import { FIELD_LABELS, type FieldKey, type ReceivedCard } from "@/lib/types";
import { fromVCard, toVCard } from "@/lib/vcard";
import { displayNameFrom } from "@/lib/validation";

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function InboxPage() {
  const { ready, inbox, updateInbox } = useLocalStore();
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<ReceivedCard | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReceivedCard | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function addCard(vcard: string, source: ReceivedCard["source"]) {
    const fields = fromVCard(vcard);
    const card: ReceivedCard = {
      id: newId(),
      receivedAt: new Date().toISOString(),
      displayName: displayNameFrom(fields),
      source,
      fields,
      vcard: vcard.includes("BEGIN:VCARD") ? vcard : toVCard(fields),
    };
    updateInbox([card, ...inbox.filter((item) => item.vcard !== card.vcard)]);
    setSelected(card);
    navigator.vibrate?.(15);
  }

  async function startListen() {
    const nfc = getNfcCapability();
    if (!nfc.supported) {
      setStatus(nfc.reason ?? "NFC isn’t available.");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setListening(true);
    setStatus("Ready to receive. Hold the other phone here.");
    try {
      await scanNfc(
        (payload) => {
          addCard(payload, "nfc");
          setStatus("Contact received.");
        },
        (message) => setStatus(message),
        controller.signal,
      );
    } catch (error) {
      setStatus(nfcErrorMessage(error));
      setListening(false);
    }
  }

  function stopListen() {
    abortRef.current?.abort();
    setListening(false);
    setStatus("");
  }

  function importFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (!text.includes("BEGIN:VCARD")) {
        setStatus("That file isn’t a vCard.");
        return;
      }
      addCard(text, "import");
      setStatus("Imported from file.");
    };
    reader.readAsText(file);
  }

  function saveSelected() {
    if (!selected) return;
    const url = URL.createObjectURL(new Blob([selected.vcard], { type: "text/vcard" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.displayName}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    updateInbox(inbox.filter((item) => item.id !== pendingDelete.id));
    if (selected?.id === pendingDelete.id) setSelected(null);
    setPendingDelete(null);
  }

  function confirmClear() {
    updateInbox([]);
    setSelected(null);
    setPendingClear(false);
  }

  if (!ready) return <h1>Loading</h1>;

  return (
    <section>
      <header className="page-header">
        <div>
          <p className="kicker">Inbox</p>
          <h1>Received</h1>
        </div>
        {inbox.length ? (
          <button className="btn btn-ghost" type="button" onClick={() => setPendingClear(true)}>
            Clear
          </button>
        ) : null}
      </header>

      <div className="stack" style={{ marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => (listening ? stopListen() : void startListen())}
        >
          {listening ? "Stop listening" : "Receive NFC tap"}
        </button>
        <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
          Import .vcf
          <input
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importFile(file);
              event.target.value = "";
            }}
          />
        </label>
        {status ? <p className={`status ${listening ? "warn" : "ok"}`}>{status}</p> : null}
      </div>

      {inbox.length === 0 ? (
        <div className="card empty">
          <p className="hero-name" style={{ fontSize: 22 }}>
            Nothing received yet
          </p>
          <p className="muted">Tap Receive, then hold another phone or tag to this device.</p>
        </div>
      ) : (
        <div className="group">
          {inbox.map((card) => (
            <div className="row" key={card.id}>
              <button className="inbox-item" type="button" onClick={() => setSelected(card)}>
                <span className="inbox-avatar">{initials(card.displayName)}</span>
                <span className="inbox-copy">
                  <strong>{card.displayName}</strong>
                  <span>
                    {new Date(card.receivedAt).toLocaleString()} · {card.source}
                  </span>
                </span>
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                aria-label={`Delete ${card.displayName}`}
                onClick={() => setPendingDelete(card)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <div className="overlay" role="presentation" onClick={() => setSelected(null)}>
          <div className="sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h2>{selected.displayName}</h2>
            <p className="muted">
              {[selected.fields.role, selected.fields.company].filter(Boolean).join(" · ") || "Shared card"}
            </p>
            <div className="group" style={{ margin: "16px 0" }}>
              {Object.entries(selected.fields)
                .filter((entry): entry is [FieldKey, string] => Boolean(entry[1]))
                .map(([key, value]) => (
                  <div className="row" key={key}>
                    <span className="row-label">
                      <small>{FIELD_LABELS[key]}</small>
                      {value}
                    </span>
                  </div>
                ))}
            </div>
            <div className="btn-row">
              <button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>
                Close
              </button>
              <button className="btn btn-primary" type="button" onClick={saveSelected}>
                Save to contacts
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this card?"
        body="This contact will be removed from Inbox on this device. You can’t undo it."
        confirmLabel="Delete card"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
      <ConfirmModal
        open={pendingClear}
        title="Clear the whole inbox?"
        body="Every received card on this device will be deleted."
        confirmLabel="Clear inbox"
        danger
        onCancel={() => setPendingClear(false)}
        onConfirm={confirmClear}
      />
    </section>
  );
}

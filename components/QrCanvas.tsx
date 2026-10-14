"use client";

import { useEffect, useRef, useState } from "react";

export function QrCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      if (!canvasRef.current || !value) return;
      try {
        const QRCode = (await import("qrcode")).default;
        await QRCode.toCanvas(canvasRef.current, value, {
          width: 196,
          margin: 1,
          color: { dark: "#1c1916", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setError("");
      } catch {
        if (!cancelled) setError("This card is too large for a QR code. Share fewer fields.");
      }
    }
    void draw();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="qr-wrap">
      <canvas ref={canvasRef} width={196} height={196} aria-label="QR code for this contact card" />
      {error ? <p className="status err">{error}</p> : null}
    </div>
  );
}

# Tap Connect

Share selected contact details by tapping phones together. Built as a mobile-first web app: Web NFC on Chrome for Android, with QR and the system share sheet where NFC is not available (notably iPhone Safari).

## Why this shape

True phone-to-phone NFC from a browser is limited. Web NFC can write a vCard to another device in reader mode or to a physical tag, and can scan incoming NDEF. iOS does not expose Web NFC, so Share always includes QR, system share, and a `.vcf` download.

Profiles stay on-device in `localStorage`. You choose fields every time you share.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on your computer, or use HTTPS (or Chrome on Android against your machine) for NFC.

Web NFC requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API) and Chrome on Android. Grant NFC permission when prompted.

## Workflow

1. Edit your card on **Details**.
2. On **Share**, toggle the fields that should leave the phone.
3. Confirm, then hold phones together (or write an NFC sticker).
4. The other phone uses **Inbox → Receive NFC tap**, or scans the QR.

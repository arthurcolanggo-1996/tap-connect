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

## Android app (phone-to-phone NFC)

Browsers can't send a card from one phone to another over NFC. The Android app can: while **Share** is open, the phone acts as an NFC tag holding a link to the card.

- A phone **without** the app gets Android's "open link" prompt and sees the card in its browser.
- A phone **with** the app can use **Inbox → Receive by NFC** to read it directly.

Build the APK (needs [Android Studio](https://developer.android.com/studio), which includes the JDK and SDK):

```bash
npm install
npm run build:app      # static export + copy into android/
npm run android:open   # opens Android Studio
```

In Android Studio: **Build → Build APK(s)**. Copy `app-debug.apk` to the phones and allow "Install unknown apps" for the app you open it from. Cards made in the app link to `https://tapkonek.vercel.app` (change with `NEXT_PUBLIC_SHARE_ORIGIN`).

Both phones need NFC on. The sending phone must be unlocked with the Share screen open.

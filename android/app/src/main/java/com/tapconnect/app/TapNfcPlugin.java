package com.tapconnect.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.net.Uri;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.cardemulation.CardEmulation;
import android.nfc.tech.Ndef;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@CapacitorPlugin(name = "TapNfc")
public class TapNfcPlugin extends Plugin {
    private NfcAdapter adapter() {
        return NfcAdapter.getDefaultAdapter(getContext());
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        NfcAdapter nfc = adapter();
        boolean hce = getContext().getPackageManager()
            .hasSystemFeature("android.hardware.nfc.hce");
        JSObject out = new JSObject();
        out.put("supported", nfc != null);
        out.put("enabled", nfc != null && nfc.isEnabled());
        out.put("canSend", nfc != null && hce);
        call.resolve(out);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NFC_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void startSharing(PluginCall call) {
        String url = call.getString("url");
        NfcAdapter nfc = adapter();
        if (url == null || url.isEmpty()) {
            call.reject("Missing link.");
            return;
        }
        if (nfc == null || !nfc.isEnabled()) {
            call.reject("NFC is off.");
            return;
        }
        NdefHostApduService.setLink(url, () -> notifyListeners("sent", new JSObject()));
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                CardEmulation.getInstance(nfc).setPreferredService(
                    activity, new ComponentName(getContext(), NdefHostApduService.class));
            } catch (Exception ignored) {
                // Still works as a normal service when no other app claims the AID.
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void stopSharing(PluginCall call) {
        NdefHostApduService.clear();
        NfcAdapter nfc = adapter();
        Activity activity = getActivity();
        if (nfc != null) {
            activity.runOnUiThread(() -> {
                try {
                    CardEmulation.getInstance(nfc).unsetPreferredService(activity);
                } catch (Exception ignored) {
                }
            });
        }
        call.resolve();
    }

    @PluginMethod
    public void startReading(PluginCall call) {
        NfcAdapter nfc = adapter();
        if (nfc == null || !nfc.isEnabled()) {
            call.reject("NFC is off.");
            return;
        }
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B
                | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V;
            nfc.enableReaderMode(activity, this::onTag, flags, null);
        });
        call.resolve();
    }

    @PluginMethod
    public void stopReading(PluginCall call) {
        NfcAdapter nfc = adapter();
        Activity activity = getActivity();
        if (nfc != null) {
            activity.runOnUiThread(() -> {
                try {
                    nfc.disableReaderMode(activity);
                } catch (Exception ignored) {
                }
            });
        }
        call.resolve();
    }

    private void onTag(Tag tag) {
        Ndef ndef = Ndef.get(tag);
        JSObject out = new JSObject();
        if (ndef == null) {
            out.put("error", "That tag has no contact card.");
            notifyListeners("tag", out);
            return;
        }
        try {
            ndef.connect();
            NdefMessage message = ndef.getNdefMessage();
            if (message != null) {
                for (NdefRecord record : message.getRecords()) {
                    if (record.getTnf() == NdefRecord.TNF_WELL_KNOWN
                        && Arrays.equals(record.getType(), NdefRecord.RTD_URI)) {
                        Uri uri = record.toUri();
                        if (uri != null) {
                            out.put("url", uri.toString());
                            break;
                        }
                    } else if (record.getTnf() == NdefRecord.TNF_MIME_MEDIA) {
                        String mime = new String(record.getType(), StandardCharsets.US_ASCII);
                        if (mime.equals("text/vcard") || mime.equals("text/x-vcard")) {
                            out.put("vcard", new String(record.getPayload(), StandardCharsets.UTF_8));
                            break;
                        }
                    }
                }
            }
            if (!out.has("url") && !out.has("vcard")) {
                out.put("error", "That tag has no contact card.");
            }
        } catch (Exception e) {
            out.put("error", "Couldn't read that. Hold the phones together and try again.");
        } finally {
            try {
                ndef.close();
            } catch (Exception ignored) {
            }
        }
        notifyListeners("tag", out);
    }
}

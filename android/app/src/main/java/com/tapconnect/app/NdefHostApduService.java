package com.tapconnect.app;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Emulates an NFC Forum Type 4 Tag holding one NDEF URI record.
 * Any NFC phone that taps this one reads it like a normal tag: phones without
 * the app get the system "open link" prompt, and the app reads it directly.
 */
public class NdefHostApduService extends HostApduService {
    public interface Listener {
        void onRead();
    }

    private static final byte[] SW_OK = {(byte) 0x90, 0x00};
    private static final byte[] SW_NOT_FOUND = {0x6A, (byte) 0x82};
    private static final byte[] SW_OFFSET = {0x6B, 0x00};
    private static final byte[] SW_INS = {0x6D, 0x00};
    private static final byte[] AID = {
        (byte) 0xD2, 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01
    };

    private static volatile byte[] ndefFile = new byte[] {0, 0};
    private static volatile Listener listener;

    private boolean appSelected = false;
    private int selected = 0; // 0 none, 1 capability container, 2 NDEF file

    public static void setLink(String url, Listener onRead) {
        ndefFile = buildNdefFile(url);
        listener = onRead;
    }

    public static void clear() {
        ndefFile = new byte[] {0, 0};
        listener = null;
    }

    static byte[] buildNdefFile(String url) {
        String prefix = "https://";
        String rest = url;
        boolean https = url.startsWith(prefix);
        if (https) {
            rest = url.substring(prefix.length());
        }
        byte[] restBytes = rest.getBytes(StandardCharsets.UTF_8);
        int payloadLen = restBytes.length + 1;
        boolean shortRecord = payloadLen <= 255;
        ByteArrayOutputStream record = new ByteArrayOutputStream();
        record.write(shortRecord ? 0xD1 : 0xC1); // MB | ME | (SR) | TNF well-known
        record.write(1); // type length
        if (shortRecord) {
            record.write(payloadLen);
        } else {
            record.write((payloadLen >> 24) & 0xFF);
            record.write((payloadLen >> 16) & 0xFF);
            record.write((payloadLen >> 8) & 0xFF);
            record.write(payloadLen & 0xFF);
        }
        record.write(0x55); // type "U" (URI)
        record.write(https ? 0x04 : 0x00); // 0x04 = "https://"
        record.write(restBytes, 0, restBytes.length);
        byte[] message = record.toByteArray();

        byte[] file = new byte[message.length + 2];
        file[0] = (byte) ((message.length >> 8) & 0xFF);
        file[1] = (byte) (message.length & 0xFF);
        System.arraycopy(message, 0, file, 2, message.length);
        return file;
    }

    private static byte[] capabilityContainer() {
        return new byte[] {
            0x00, 0x0F, // CC length
            0x20, // mapping version 2.0
            0x00, 0x3B, // max read size
            0x00, 0x34, // max write size
            0x04, 0x06, // NDEF file control TLV
            (byte) 0xE1, 0x04, // NDEF file id
            0x7F, (byte) 0xFF, // max NDEF file size
            0x00, // read access: open
            (byte) 0xFF, // write access: none
        };
    }

    private static byte[] withStatus(byte[] data, byte[] status) {
        byte[] out = new byte[data.length + status.length];
        System.arraycopy(data, 0, out, 0, data.length);
        System.arraycopy(status, 0, out, data.length, status.length);
        return out;
    }

    @Override
    public byte[] processCommandApdu(byte[] c, Bundle extras) {
        if (c == null || c.length < 4) return SW_INS;
        int ins = c[1] & 0xFF;

        if (ins == 0xA4) { // SELECT
            int p1 = c[2] & 0xFF;
            int lc = c.length > 4 ? c[4] & 0xFF : 0;
            if (p1 == 0x04) {
                if (lc != AID.length || c.length < 5 + lc) return SW_NOT_FOUND;
                for (int i = 0; i < AID.length; i++) {
                    if (c[5 + i] != AID[i]) return SW_NOT_FOUND;
                }
                appSelected = true;
                selected = 0;
                return SW_OK;
            }
            if (p1 == 0x00 && lc == 2 && c.length >= 7 && appSelected) {
                int id = ((c[5] & 0xFF) << 8) | (c[6] & 0xFF);
                if (id == 0xE103) selected = 1;
                else if (id == 0xE104) selected = 2;
                else return SW_NOT_FOUND;
                return SW_OK;
            }
            return SW_NOT_FOUND;
        }

        if (ins == 0xB0) { // READ BINARY
            byte[] data = selected == 1 ? capabilityContainer() : selected == 2 ? ndefFile : null;
            if (data == null) return SW_NOT_FOUND;
            int offset = ((c[2] & 0xFF) << 8) | (c[3] & 0xFF);
            int le = c.length > 4 ? c[4] & 0xFF : 256;
            if (le == 0) le = 256;
            if (offset > data.length) return SW_OFFSET;
            int n = Math.min(le, data.length - offset);
            byte[] chunk = new byte[n];
            System.arraycopy(data, offset, chunk, 0, n);
            if (selected == 2 && offset + n >= data.length && data.length > 2) {
                Listener l = listener;
                if (l != null) l.onRead();
            }
            return withStatus(chunk, SW_OK);
        }

        return SW_INS;
    }

    @Override
    public void onDeactivated(int reason) {
        appSelected = false;
        selected = 0;
    }
}

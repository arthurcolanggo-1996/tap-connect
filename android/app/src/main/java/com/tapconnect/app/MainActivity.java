package com.tapconnect.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TapNfcPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

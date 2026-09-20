package com.ryza.chat;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

/**
 * Thin WebView shell. No androidx — the whole app is the bundled web build
 * served from AssetServer on 127.0.0.1 (Spine cannot load from file://).
 */
public class MainActivity extends Activity {
    private AssetServer server;
    private WebView web;
    private long lastBackTime = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        server = new AssetServer(getAssets(), 8765);
        server.start();

        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient());
        web.loadUrl("http://127.0.0.1:8765/");
    }

    @Override public void onPause()  { super.onPause();  if (web != null) web.onPause(); }
    @Override public void onResume() { super.onResume(); if (web != null) web.onResume(); }

    @Override
    public void onBackPressed() {
        if (web == null) {
            handleExitGuard();
            return;
        }
        web.evaluateJavascript("window.App && App.handleBack ? App.handleBack() : 0", value -> {
            if ("1".equals(value) || "true".equals(value)) {
                lastBackTime = 0;
                return;
            }
            handleExitGuard();
        });
    }

    private void handleExitGuard() {
        long now = System.currentTimeMillis();
        if (now - lastBackTime < 2000) {
            finishAffinity();
        } else {
            lastBackTime = now;
            Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        if (server != null) server.stopServer();
        if (web != null) web.destroy();
        super.onDestroy();
    }
}

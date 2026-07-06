package com.mineradio.app;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private long lastBackPressTime = 0;
    private static final int DOUBLE_PRESS_INTERVAL = 1500;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 注册自定义 Capacitor 插件 — 必须在 super.onCreate() 之前
        registerPlugin(MineradioHttpPlugin.class);
        registerPlugin(MineradioAudioPlugin.class);

        super.onCreate(savedInstanceState);

        // 保持屏幕常亮
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            long currentTime = System.currentTimeMillis();

            if (currentTime - lastBackPressTime < DOUBLE_PRESS_INTERVAL) {
                finishAffinity();
                System.exit(0);
                return true;
            }

            lastBackPressTime = currentTime;

            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().post(() -> {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        getBridge().getWebView().evaluateJavascript(
                            "if(typeof showBackPressHint === 'function') showBackPressHint();",
                            null
                        );
                    }
                });
            }

            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}

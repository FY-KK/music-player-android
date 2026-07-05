package com.mineradio.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.view.KeyEvent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressTime = 0;
    private static final int DOUBLE_PRESS_INTERVAL = 1500; // 1.5秒内按两次退出

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 获取 WebView 并配置
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // 启用 JavaScript
        settings.setJavaScriptEnabled(true);

        // 启用 DOM Storage
        settings.setDomStorageEnabled(true);

        // 允许文件访问
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // 启用混合内容（HTTP/HTTPS 混合）
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // 启用媒体自动播放
        settings.setMediaPlaybackRequiresUserGesture(false);

        // 缓存设置
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setDatabaseEnabled(true);

        // 视口设置
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // 支持多窗口
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // User-Agent 设置
        String userAgent = settings.getUserAgentString();
        settings.setUserAgentString(userAgent + " MineradioAndroid/1.0");
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            long currentTime = System.currentTimeMillis();

            if (currentTime - lastBackPressTime < DOUBLE_PRESS_INTERVAL) {
                // 双击返回键，退出应用
                finishAffinity();
                System.exit(0);
                return true;
            }

            // 第一次按下，记录时间并显示提示
            lastBackPressTime = currentTime;

            // 向WebView发送消息，显示提示
            getBridge().getWebView().post(() -> {
                getBridge().getWebView().evaluateJavascript(
                    "if(typeof showBackPressHint === 'function') showBackPressHint();",
                    null
                );
            });

            return true;
        }
        return super.onKeyDown(keyCode, event);
    }
}

package com.mineradio.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
}

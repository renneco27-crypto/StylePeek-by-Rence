/**
 * StylePeek Studio — Offline Android App Packager
 * js/sp_android_export.js
 *
 * Generates an offline Android Studio project (.zip) with:
 * 1. OfflineResourceInterceptor.java (zero-latency offline asset serving & ad blocking)
 * 2. MainActivity.java with Top (Status Bar) & Bottom (Nav Bar) Safe-Area Insets
 * 3. AndroidManifest.xml & Gradle configuration
 *
 * Strictly under 700 lines (Law 43 in ui-laws.txt).
 */

(function () {
  window.StylePeek = window.StylePeek || {};
  const SP = window.StylePeek;

  const STITCHCSV_OFFLINE_INTERCEPTOR_JAVA = `package com.studyup.app;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.MimeTypeMap;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * OfflineResourceInterceptor (from StitchCSV-feature-caching-mechanism)
 *
 * Serves bundled static HTML/CSS/JS/Media assets in 0ms from:
 *   1. Internal hot-swap directory: context.getFilesDir() + "/webapp/"
 *   2. APK bundled assets: assets/public/
 * Blocks external ad networks (Google AdSense, DoubleClick) automatically.
 */
public class OfflineResourceInterceptor {
    private static final String TAG = "OfflineInterceptor";

    public static void attachServiceWorkerInterceptor(Context context) {
        try {
            ServiceWorkerController swController = ServiceWorkerController.getInstance();
            swController.setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    return intercept(context, request);
                }
            });
        } catch (Throwable t) {
            Log.w(TAG, "ServiceWorkerController not supported on this Android API", t);
        }
    }

    public static WebResourceResponse intercept(Context context, WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        Uri uri = request.getUrl();
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String urlStr = uri.toString().toLowerCase();

        // Block Google AdSense, DoubleClick & Ad tracking requests
        if (host.contains("googlesyndication.com") ||
            host.contains("doubleclick.net") ||
            host.contains("googleadservices.com") ||
            host.contains("taboola.com") ||
            host.contains("outbrain.com") ||
            urlStr.contains("adsbygoogle")) {
            return new WebResourceResponse("text/plain", "UTF-8", 204, "No Content", getCorsHeaders(), null);
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) {
            path = "/index.html";
        }
        String cleanPath = path.startsWith("/") ? path.substring(1) : path;

        // 1. Check hot-swappable local directory: filesDir/webapp/<cleanPath>
        try {
            File localFile = new File(new File(context.getFilesDir(), "webapp"), cleanPath);
            if (!localFile.exists() && !cleanPath.contains(".")) {
                localFile = new File(new File(context.getFilesDir(), "webapp"), cleanPath + ".html");
            }
            if (localFile.exists() && localFile.isFile()) {
                String mime = getMimeType(localFile.getName());
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", getCorsHeaders(), new FileInputStream(localFile));
            }
        } catch (Exception ignored) {}

        // 2. Serve from APK bundled assets/public/<cleanPath>
        AssetManager assets = context.getAssets();
        String[] candidates = new String[] {
            "public/" + cleanPath,
            "public/" + cleanPath + ".html",
            "public/" + cleanPath + "/index.html",
            "public/index.html"
        };

        for (String candidate : candidates) {
            try {
                InputStream is = assets.open(candidate);
                String mime = getMimeType(candidate);
                return new WebResourceResponse(mime, "UTF-8", 200, "OK", getCorsHeaders(), is);
            } catch (Exception ignored) {}
        }

        return null;
    }

    private static Map<String, String> getCorsHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        headers.put("Cache-Control", "public, max-age=31536000, immutable");
        return headers;
    }

    private static String getMimeType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".woff2")) return "font/woff2";
        if (lower.endsWith(".woff")) return "font/woff";
        if (lower.endsWith(".ttf")) return "font/ttf";
        String ext = MimeTypeMap.getFileExtensionFromUrl(fileName);
        if (ext != null) {
            String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            if (guessed != null) return guessed;
        }
        return "application/octet-stream";
    }
}
`;

  const STITCHCSV_MAIN_ACTIVITY_JAVA = `package com.studyup.app;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

/**
 * MainActivity (from StitchCSV-feature-caching-mechanism)
 *
 * Includes:
 * 1. OfflineResourceInterceptor for 100% offline zero-latency WebView rendering.
 * 2. Top & Bottom Native Android Safe-Area Margins so WebView content NEVER overlaps
 *    with the top Android Notification / Status Bar or the bottom Native Android Navigation Bar.
 */
public class MainActivity extends AppCompatActivity {
    private WebView webView;

    private int dpToPx(int dp) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics()
        ));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure system windows (Status Bar + Bottom Navigation Bar) are respected
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);

        // Enforce Top (Notification/Status Bar) and Bottom (Native Android Navbar) Safe Margins
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int safeTopPx = Math.max(bars.top, dpToPx(26));
            int safeBottomPx = Math.max(bars.bottom, dpToPx(36));

            ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) view.getLayoutParams();
            lp.topMargin = safeTopPx;
            lp.bottomMargin = safeBottomPx;
            lp.leftMargin = bars.left;
            lp.rightMargin = bars.right;
            view.setLayoutParams(lp);
            return WindowInsetsCompat.CONSUMED;
        });

        OfflineResourceInterceptor.attachServiceWorkerInterceptor(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse offline = OfflineResourceInterceptor.intercept(MainActivity.this, request);
                if (offline != null) return offline;
                return super.shouldInterceptRequest(view, request);
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;

  const STITCHCSV_ACTIVITY_MAIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/root_container"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#0F172A"
    android:fitsSystemWindows="true">

    <WebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_marginTop="26dp"
        android:layout_marginBottom="36dp" />
</FrameLayout>
`;

  const STITCHCSV_ANDROID_MANIFEST_XML = appTitle => `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.studyup.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:label="${(appTitle || "OfflineApp").replace(/["<>]/g, "")}"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:theme="@style/Theme.AppCompat.DayNight.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;

  const STITCHCSV_SAFE_AREA_CSS = `
/* ── StitchCSV Android Top Notification Panel & Bottom Native Navbar Safe Clearance ── */
:root {
  --sp-android-top-safe: max(env(safe-area-inset-top, 0px), 26px);
  --sp-android-bottom-safe: max(env(safe-area-inset-bottom, 0px), 36px);
}
html, body {
  padding-top: var(--sp-android-top-safe) !important;
  padding-bottom: var(--sp-android-bottom-safe) !important;
  box-sizing: border-box !important;
}
`;

  function normalizeZipPath(p) {
    const parts = [];
    for (const seg of (p || "").replace(/\\/g, "/").split("/")) {
      if (!seg || seg === ".") continue;
      if (seg === "..") {
        parts.pop();
      } else {
        parts.push(seg);
      }
    }
    return parts.join("/");
  }

  async function generateOfflineAndroidAppZip(sourceWebZip, appName = "OfflineWebApp") {
    const cleanAppName = (appName || "OfflineWebApp").replace(/[^a-zA-Z0-9_-]/g, "") || "OfflineWebApp";
    const outZip = new JSZip();

    // 1. Copy all website files into android/app/src/main/assets/public/
    const entries = [];
    for (const [rawPath, zipObj] of Object.entries(sourceWebZip.files)) {
      if (zipObj.dir) continue;
      entries.push({ norm: normalizeZipPath(rawPath), zipObj });
    }

    // Strip common single top-level folder prefix if present
    const firstSegs = new Set(entries.map(e => e.norm.split("/")[0]));
    const stripPrefix = firstSegs.size === 1 && entries.some(e => e.norm.includes("/"))
      ? Array.from(firstSegs)[0] + "/"
      : "";

    for (const { norm, zipObj } of entries) {
      const rel = stripPrefix && norm.startsWith(stripPrefix) ? norm.slice(stripPrefix.length) : norm;
      if (!rel) continue;
      if (rel.toLowerCase().endsWith(".html") || rel.toLowerCase().endsWith(".htm")) {
        let html = await zipObj.async("string");
        if (/<\/head>/i.test(html)) {
          html = html.replace(/<\/head>/i, `<style id="sp-android-safe-margins">${STITCHCSV_SAFE_AREA_CSS}</style>\n</head>`);
        } else {
          html = `<style id="sp-android-safe-margins">${STITCHCSV_SAFE_AREA_CSS}</style>\n` + html;
        }
        outZip.file(`android/app/src/main/assets/public/${rel}`, html);
      } else {
        const bytes = await zipObj.async("uint8array");
        outZip.file(`android/app/src/main/assets/public/${rel}`, bytes);
      }
    }

    // 2. Add StitchCSV OfflineResourceInterceptor.java, MainActivity.java, Layout & Manifest
    outZip.file(
      "android/app/src/main/java/com/studyup/app/OfflineResourceInterceptor.java",
      STITCHCSV_OFFLINE_INTERCEPTOR_JAVA
    );
    outZip.file(
      "android/app/src/main/java/com/studyup/app/MainActivity.java",
      STITCHCSV_MAIN_ACTIVITY_JAVA
    );
    outZip.file(
      "android/app/src/main/res/layout/activity_main.xml",
      STITCHCSV_ACTIVITY_MAIN_XML
    );
    outZip.file(
      "android/app/src/main/AndroidManifest.xml",
      STITCHCSV_ANDROID_MANIFEST_XML(cleanAppName)
    );
    outZip.file(
      "android/app/build.gradle",
      `plugins {
    id 'com.android.application'
}
android {
    namespace "com.studyup.app"
    compileSdk 34
    defaultConfig {
        applicationId "com.studyup.app.${cleanAppName.toLowerCase()}"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}
dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core:1.12.0'
}
`
    );
    outZip.file(
      "android/settings.gradle",
      `rootProject.name = "${cleanAppName}"\ninclude ':app'\n`
    );
    outZip.file(
      "run_build_apk.ps1",
      `# Build Offline Android APK (${cleanAppName})\nSet-Location "$PSScriptRoot\\\\android"\n.\\\\gradlew assembleDebug\nWrite-Host "APK built at android/app/build/outputs/apk/debug/app-debug.apk"\n`
    );

    return { outZip, cleanAppName };
  }

  window.generateOfflineAndroidAppZip = generateOfflineAndroidAppZip;
  SP.generateOfflineAndroidAppZip = generateOfflineAndroidAppZip;
})();

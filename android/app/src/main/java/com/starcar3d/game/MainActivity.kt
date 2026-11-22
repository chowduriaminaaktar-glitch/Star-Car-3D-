package com.starcar3d.game

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import java.io.ByteArrayInputStream

class MainActivity : AppCompatActivity() {

    companion object {
        private const val GAME_ENTRY_URL = "https://appassets.androidplatform.net/assets/www/index.html"
    }

    private lateinit var webView: WebView
    private lateinit var loadingOverlay: LinearLayout
    private lateinit var errorOverlay: LinearLayout
    private lateinit var errorMessageText: TextView
    private lateinit var retryButton: Button
    private lateinit var coinManager: CoinManager

    private var keepSplashOnScreen = true
    private var gameReady = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { keepSplashOnScreen }

        super.onCreate(savedInstanceState)

        // Force landscape-only orientation immediately from cold app launch across all screens
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE

        // Extend behind display cutout (notch/camera hole) for true edge-to-edge racing
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.gameWebView)
        loadingOverlay = findViewById(R.id.loadingOverlay)
        errorOverlay = findViewById(R.id.errorOverlay)
        errorMessageText = findViewById(R.id.errorMessageText)
        retryButton = findViewById(R.id.retryButton)

        retryButton.setOnClickListener {
            loadLocalGame()
        }

        coinManager = CoinManager(this)
        configureWebView()
        setupBackNavigation()
        applyImmersiveMode()

        if (savedInstanceState == null) {
            loadLocalGame()
        } else {
            webView.restoreState(savedInstanceState)
            keepSplashOnScreen = false
            loadingOverlay.visibility = View.GONE
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.setBackgroundColor(Color.parseColor("#020617"))
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val uri: Uri = request.url
                if (uri.host == "appassets.androidplatform.net") {
                    return assetLoader.shouldInterceptRequest(uri)
                }
                // Block external network requests so the game stays 100% offline & fast
                return WebResourceResponse(
                    "text/plain",
                    "utf-8",
                    404,
                    "Offline Asset Mode",
                    emptyMap(),
                    ByteArrayInputStream(ByteArray(0))
                )
            }

            override fun onPageFinished(view: WebView, url: String?) {
                super.onPageFinished(view, url)
                keepSplashOnScreen = false
                // Fallback hide loading overlay in case JS ready callback fires earlier/later
                view.postDelayed({
                    if (!isFinishing && !isDestroyed) {
                        loadingOverlay.visibility = View.GONE
                    }
                }, 450)
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame) {
                    keepSplashOnScreen = false
                    showErrorScreen(getString(R.string.error_load_failed))
                }
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: RenderProcessGoneDetail
            ): Boolean {
                keepSplashOnScreen = false
                showErrorScreen(getString(R.string.error_webgl_lost))
                return true
            }
        }

        webView.addJavascriptInterface(StarCarJsBridge(), "StarCarAndroid")
    }

    private fun loadLocalGame() {
        gameReady = false
        errorOverlay.visibility = View.GONE
        loadingOverlay.visibility = View.VISIBLE
        webView.loadUrl(GAME_ENTRY_URL)
    }

    private fun showErrorScreen(message: String) {
        runOnUiThread {
            loadingOverlay.visibility = View.GONE
            errorMessageText.text = message
            errorOverlay.visibility = View.VISIBLE
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (errorOverlay.visibility == View.VISIBLE) {
                    finish()
                    return
                }
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('starcar:android-back'));",
                    null
                )
            }
        })
    }

    private fun applyImmersiveMode() {
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            applyImmersiveMode()
        }
    }

    override fun onResume() {
        super.onResume()
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        webView.onResume()
        webView.resumeTimers()
        applyImmersiveMode()
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('starcar:app-resume'));",
            null
        )
    }

    override fun onPause() {
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('starcar:app-pause'));",
            null
        )
        webView.onPause()
        webView.pauseTimers()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("StarCarAndroid")
        webView.destroy()
        super.onDestroy()
    }

    inner class StarCarJsBridge {
        @JavascriptInterface
        fun onGameReady() {
            runOnUiThread {
                gameReady = true
                keepSplashOnScreen = false
                loadingOverlay.visibility = View.GONE
                errorOverlay.visibility = View.GONE
            }
        }

        @JavascriptInterface
        fun setGameplayMode(isGameplay: Boolean) {
            runOnUiThread {
                // Keep landscape-only orientation throughout the entire app (menus, garage, and racing)
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                applyImmersiveMode()
            }
        }

        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                finish()
            }
        }

        @JavascriptInterface
        fun getCoins(): Int {
            return coinManager.getCoins()
        }

        @JavascriptInterface
        fun addCoins(amount: Int): Int {
            return coinManager.addCoins(amount)
        }

        @JavascriptInterface
        fun spendCoins(amount: Int): Int {
            return coinManager.spendCoins(amount)
        }

        @JavascriptInterface
        fun setCoins(amount: Int): Int {
            return coinManager.setCoins(amount)
        }
    }
}

# Keep WebView JavascriptInterface bridge methods in release builds
-keepclassmembers class com.starcar3d.game.MainActivity$StarCarJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*

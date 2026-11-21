# STAR CAR 3D — Android Studio Project

Native Kotlin Android application (`com.starcar3d.game`) wrapping the complete **STAR CAR 3D** Three.js WebGL game via `WebView` + `WebViewAssetLoader` for 100% offline local asset execution.

## Configuration
- **App Name:** STAR CAR 3D
- **Package ID:** `com.starcar3d.game`
- **Min SDK:** API 24 (Android 7.0)
- **Target / Compile SDK:** API 35
- **Version:** `1.0.0` (`versionCode = 1`)

## Syncing Web Game Assets
From the repository root, run:
```bash
npm run build:android
```
This builds the Vite bundle with relative asset paths (`--base=./`) and copies all HTML, CSS, JavaScript, and procedural Three.js assets into `android/app/src/main/assets/www/`.

## Building the APK in Android Studio or CLI
1. Open the `android/` directory in **Android Studio** (Ladybug or newer) with JDK 17 and Android SDK 35 installed, or use Gradle CLI from `android/`:
   ```bash
   # Debug APK -> app/build/outputs/apk/debug/app-debug.apk
   ./gradlew assembleDebug

   # Release APK -> app/build/outputs/apk/release/app-release.apk
   ./gradlew assembleRelease
   ```
2. For Play Store distribution, configure a production `signingConfig` in `android/app/build.gradle.kts` before running `assembleRelease`.

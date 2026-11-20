# Vyde — Sideload & Installation Guide

This guide explains how to install, sideload, and update **Vyde** on any Android device without the Google Play Store.

---

## 1. Distribution Philosophy

Vyde is an open-source, privacy-preserving mobile client designed to be distributed directly to users via **Sideloading (Direct APK)** and **F-Droid**. It contains zero proprietary Google Play Services dependencies and zero tracking libraries.

---

## 2. Option A: Direct APK Installation (Recommended)

### Step 1 — Download the Latest APK
1. Navigate to the [Vyde GitHub Releases](https://github.com/mugmarp/Vyde/releases) or the GitHub Actions artifacts of the latest build.
2. Download the `vyde-android-debug-apk.zip` or `vyde-release.apk`.
3. If downloaded as a `.zip`, extract it to locate the `.apk` file.

### Step 2 — Enable "Install Unknown Apps"
1. Open Android **Settings** $\rightarrow$ **Apps** (or **Security & Privacy**).
2. Tap **Special App Access** $\rightarrow$ **Install Unknown Apps**.
3. Select your browser or file manager (e.g., Chrome, Files, or F-Droid).
4. Toggle on **Allow from this source**.

### Step 3 — Install the APK
1. Tap the downloaded `.apk` file in your notifications or Downloads folder.
2. When prompted, tap **Install**.
3. If Google Play Protect displays an "Unrecognized app" alert, tap **More details** $\rightarrow$ **Install anyway** (this is standard for open-source apps not registered with Google's proprietary Play Console).
4. Tap **Open** to launch Vyde.

---

## 3. Option B: F-Droid Custom Repository

For automated updates, Vyde provides an F-Droid metadata recipe located at [`metadata/com.vyde.android.yml`](../metadata/com.vyde.android.yml).

1. Install [F-Droid](https://f-droid.org/) or [Droid-ify](https://github.com/Droid-ify/client).
2. Add the Vyde repository URL in F-Droid Settings $\rightarrow$ Repositories.
3. Refresh repositories and search for **Vyde**.
4. Tap **Install**. F-Droid will automatically manage future background updates.

---

## 4. Option C: Build from Source Locally

If you prefer building the binary yourself with full reproducibility:

### Prerequisites
- Node.js 22+
- `pnpm` (v9+)
- Java Development Kit (JDK 17)
- Android SDK & Platform Tools (`adb`)

### Build Steps
```bash
# 1. Clone repository
git clone https://github.com/mugmarp/Vyde.git
cd Vyde

# 2. Install workspace dependencies
pnpm install

# 3. Generate native Android project via Expo prebuild
cd artifacts/vyde
npx expo prebuild --platform android --no-install

# 4. Compile APK using Gradle
cd android
./gradlew assembleDebug

# 5. Locate APK & install via ADB
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 5. Storage & Permissions

Vyde requires minimal system permissions:
- **Internet (`android.permission.INTERNET`)**: To stream and download media directly from YouTube content delivery networks.
- **Network State (`android.permission.ACCESS_NETWORK_STATE`)**: To gracefully detect airplane mode and toggle the offline media experience.
- **File System**: Vyde stores downloads and its SQLite database in the application's isolated sandbox (`documentDirectory/vyde-downloads/` and `documentDirectory/SQLite/vyde_v1.db`), requiring **no invasive global file system permissions** on modern Android (10+).

---

## 6. Updating Vyde

- **Direct APK**: When a new version is released on GitHub, download the new `.apk` and install it directly over the existing app. Your watch history, playlists, liked videos, and downloads will remain intact in the local SQLite database.
- **F-Droid**: Updates will appear in your F-Droid client update queue automatically.

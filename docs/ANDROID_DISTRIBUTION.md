# Android Distribution & Installation Guide

This guide covers how to build, package, and distribute the Android version of **Kairo 4K Streamer**.

## 🚀 Prerequisites

1.  **Android Studio** installed (with SDK and Build Tools).
2.  **Java/JDK 17+** (included with Android Studio).
3.  **ADB (Android Debug Bridge)** (optional but recommended, part of Platform Tools).
4.  **A release keystore file** (only for Google Play Store distribution).

---

## 🏗️ Building a Debug APK (For Testing)

This is the quickest way to get an APK to share with testers or install on your own device without dealing with signing keys.

1.  **Sync the Latest Code:**
    Ensure your web app is built and synced to the Android project.
    ```bash
    npm run build:android
    ```

2.  **Open Android Studio:**
    ```bash
    npx cap open android
    ```

3.  **Build the APK:**
    In Android Studio:
    - Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
    - Wait for the build to complete.
    - A notification will appear in the bottom right corner: "APK(s) generated successfully."
    - Click **locate** in the notification to open the folder containing the `app-debug.apk` file.

4.  **Install on a Device:**
    - Connect your Android device via USB.
    - Enable **Developer Options** and **USB Debugging** on your device.
    - Run the app directly from Android Studio (Green Play Button).
    - **OR**, copy the `app-debug.apk` file to your phone and install it via a file manager.

---

## 📦 Building a Release APK (For Distribution)

To distribute publicly or upload to the Google Play Store, you must generate a **Signed App Bundle (AAB)** or **Signed APK**.

### 1. Versioning
Before building a release, update the version code and name in `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        versionCode 1 // Increment this for every update (must be an integer)
        versionName "1.0" // User-visible version string (e.g., "1.0.1")
    }
}
```

### 2. Generate a Signed Bundle / APK
In Android Studio:

1.  Go to **Build > Generate Signed Bundle / APK**.
2.  Select **Android App Bundle** (recommended for Play Store) or **APK** (for direct distribution).
3.  Click **Next**.
4.  **Key Store Path**:
    - If you have an existing keystore (`.jks` or `.keystore` file), select it.
    - If not, click **Create new...**:
        - Choose a location to save your keystore file (keep this safe!).
        - **Password**: Create a strong password (you will need this for every update).
        - **Alias**: A name for your key (e.g., `key0`).
        - **Key Password**: Same as the store password or different.
        - Fill in the certificate details (First and Last Name, Organization Unit, etc. - at least one field is required).
5.  Click **Next**.
6.  Select the **release** build variant.
7.  Click **Create**.

### 3. Locate the Output
- **Bundle (AAB)**: Usually found in `android/app/release/app-release.aab`. Upload this file to the Google Play Console.
- **APK**: usually found in `android/app/release/app-release.apk`. Share this file directly with users for sideloading.

---

## 📲 Installation on Android Devices

### Method A: Direct Install via USB (ADB)
1.  Connect your device via USB.
2.  Ensure USB Debugging is enabled.
3.  Run:
    ```bash
    adb install path/to/app-release.apk
    ```

### Method B: Sideloading (Direct File Transfer)
1.  Transfer the `.apk` file to your device (via USB, Google Drive, email, etc.).
2.  Open your file manager app on the device.
3.  Tap the APK file.
4.  If prompted, allow installation from "Unknown Sources" for your file manager.
5.  Tap **Install**.

### Method C: Google Play Store (Internal Testing)
If you want to distribute to a closed group of testers:
1.  Upload your **AAB** file to the **Google Play Console** > **Testing** > **Internal testing**.
2.  Create a release.
3.  Add testers by email.
4.  Testers will receive a link to install the app directly from the Play Store.

---

## ⚠️ Important Notes

- **Keystore Security**: **NEVER lose your keystore file or password.** If you lose it, you will not be able to update your app on the Play Store and will have to publish a completely new app with a different package name.
- **Package Name**: Your package name is `com.Kairo 4K.streamer`. This is unique and cannot be changed once published.
- **Permissions**: The app currently requests `INTERNET` permission. If you add features like camera or location, ensure you handle runtime permissions correctly.


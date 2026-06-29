#!/bin/bash

# Berhenti jika ada error
set -e

echo "========================================="
echo " Persiapan Build APK di GitHub Codespaces"
echo "========================================="

# 1. Update dan Install Java 17 (Syarat wajib untuk React Native / Gradle modern)
echo "[1/5] Menginstall Java 17..."
sudo apt-get update -qq
sudo apt-get install -y openjdk-17-jdk-headless -qq > /dev/null
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"

# 2. Setup Node.js v20 (Sesuai kebutuhan Expo SDK 56)
echo "[2/5] Menginstall Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null
sudo apt-get install -y nodejs -qq > /dev/null

# 3. Setup Android SDK
echo "[3/5] Menyiapkan Android SDK..."
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

if [ ! -d "$ANDROID_HOME" ]; then
    mkdir -p "$ANDROID_HOME"
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-10406996_latest.zip -O cmdline-tools.zip
    unzip -q cmdline-tools.zip -d "$ANDROID_HOME"
    mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
    mv "$ANDROID_HOME/cmdline-tools/bin" "$ANDROID_HOME/cmdline-tools/lib" "$ANDROID_HOME/cmdline-tools/source.properties" "$ANDROID_HOME/cmdline-tools/latest/" 2>/dev/null || true
    rm cmdline-tools.zip
fi

# Setujui lisensi dan install tools yang dibutuhkan (Platform Tools, SDK 34, Build Tools)
yes | sdkmanager --licenses > /dev/null
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null

# 4. Install NPM dependencies & Generate Android folder (Prebuild)
echo "[4/5] Menginstall NPM dependencies dan Expo Prebuild..."
npm install
npx expo prebuild --platform android --no-install

# 5. Build APK
echo "[5/5] Memulai proses Build APK..."
cd android
chmod +x gradlew
./gradlew assembleRelease

echo "========================================="
echo " Build Selesai! 🎉"
echo " File APK kamu berada di:"
echo " android/app/build/outputs/apk/release/app-release.apk"
echo "========================================="

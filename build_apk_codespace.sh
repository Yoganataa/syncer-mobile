#!/bin/bash

# Berhenti jika ada error
set -e

echo "========================================="
echo " Persiapan Build APK di GitHub Codespaces"
echo "========================================="

# 1. Update dan Install Java 17 (Syarat wajib untuk React Native / Gradle modern)
echo "[1/4] Menginstall Java 17..."
sudo apt-get update -qq
sudo apt-get install -y openjdk-17-jdk-headless -qq > /dev/null
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"

# 2. Setup Android SDK
echo "[2/4] Menyiapkan Android SDK..."
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

# 3. Install NPM dependencies (jika belum)
echo "[3/4] Menginstall NPM dependencies..."
npm install > /dev/null

# 4. Build APK
echo "[4/4] Memulai proses Build APK..."
cd android
chmod +x gradlew
./gradlew assembleRelease

echo "========================================="
echo " Build Selesai! 🎉"
echo " File APK kamu berada di:"
echo " android/app/build/outputs/apk/release/app-release.apk"
echo "========================================="

# Release Build Notes

This document contains critical information for building and releasing CurioConnect that is NOT in CLAUDE.md. Read this before attempting any build or release tasks.

## Current State (2026-03-17)

- **Version**: 1.0.1 / versionCode 2
- **Expo SDK**: 52 (upgraded from 51)
- **React Native**: 0.76.9 (upgraded from 0.74.5)
- **Android target**: API 35 (required by Google Play for new apps as of 2024)
- **Status**: Release APK crashes on launch due to missing `ExpoCrypto` native module. Needs a clean prebuild + build to fix.

## The Crash Bug (MUST FIX)

The release APK crashes with: `Cannot find native module 'ExpoCrypto'`

**Root cause**: `expo-crypto` was added as a JS dependency but the Android native project was not regenerated to include it. The native module is missing from the APK.

**Fix**: Run `npx expo prebuild --platform android --clean`, then re-apply all build.gradle customizations (see CLAUDE.md "After every expo prebuild --clean" section), then build.

## Upload Keystore

The upload keystore (`upload-keystore.jks`) is NOT in git (gitignored). It must be kept safe outside the repo.
- **Password**: `CurioConnect`
- **Alias**: `upload`
- **Key password**: `CurioConnect`
- This key is registered with Google Play. If lost, you must contact Google Play support to reset the upload key.
- After `expo prebuild --clean`, you must copy the keystore back to `android/app/upload-keystore.jks`.

## AdMob Configuration

- App ID: `ca-app-pub-2213890156530970~8173572553`
- This MUST be in `AndroidManifest.xml` as a `<meta-data>` tag inside `<application>`. Without it, the app crashes immediately on launch with no useful error message.
- Ad unit IDs are in `src/lib/ads.ts`
- The `react-native-google-mobile-ads` config in `app.json` (root-level `react-native-google-mobile-ads` key) sets the app ID for prebuild, but after `--clean` prebuild you must verify the manifest has it.

## Dependency Version Constraints

| Package | Required Version | Why |
|---------|-----------------|-----|
| `expo-crypto` | `~14.0.0` | v55+ needs Expo 53's `expo-module-gradle-plugin` |
| `react-native-google-mobile-ads` | `^14.2.4` | v16+ needs Kotlin 2.2; Expo 52 ships Kotlin 1.9.25 |
| `expo` | `^52` | v53 not yet compatible with all deps |

## Build Checklist

Before building a release APK/AAB:

1. [ ] `upload-keystore.jks` is at `android/app/upload-keystore.jks`
2. [ ] `android/local.properties` exists with correct `sdk.dir`
3. [ ] `android/app/build.gradle` has:
   - `debuggableVariants = []`
   - Release signing config pointing to `upload-keystore.jks`
   - `signingConfig signingConfigs.release` in release buildType
   - Correct `versionCode` and `versionName`
4. [ ] `android/build.gradle` has `targetSdkVersion` default `'35'`
5. [ ] `AndroidManifest.xml` has AdMob APPLICATION_ID meta-data
6. [ ] Version is consistent across: `app.json`, `android/app/build.gradle`, `src/lib/version.ts`

## Google Play Console Status

- Developer account created
- App created as `com.curioconnect.app`
- AAB v1.0.1 (versionCode 2) was uploaded but may need re-upload after the crash fix
- Store listing: English (en-US) and Hebrew (he-IL)
- Privacy policy on GitHub Pages
- Target audience: 13+
- Still needs: Data Safety section, Content Rating questionnaire, final review

## Expo 52 Migration Notes

Changes made during Expo 51 -> 52 upgrade:
- `src/lib/notifications.ts`: Trigger format changed to `{ type: 'date', date }`
- `src/screens/onboarding/InterestSelectionScreen.tsx`: `FONTS.weights.semiBold` -> `semibold`
- Added `expo-crypto@~14.0.0` as explicit dependency (required by Supabase auth)
- Kotlin version: 1.9.25 (from Expo 52 defaults)
- AGP (Android Gradle Plugin) supports compileSdk 35 (Expo 51's AGP 8.2.1 did not)

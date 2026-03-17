# Google Play Release Checklist

## Things Claude can do for you

### App Config
- [x] Bump `version` to `1.0.0` and add `android.versionCode` in app.json
- [x] Set up `eas.json` for production builds
- [x] Replace test AdMob IDs with real ones (Android done, iOS still test IDs)
- [x] Configure Google OAuth redirect URI for production (`curioconnect://` already works)

### UI Changes
- [x] Remove the version number from the homepage
- [x] Add a Privacy Policy / Terms of Service screen/link in the app

### Privacy Policy
- [x] Create the Privacy Policy HTML page (for GitHub Pages hosting)

## Things you need to do yourself

### Google Play Console
- [ ] Create a Google Play Developer account ($25)
- [ ] Prepare store listing assets (screenshots, feature graphic, descriptions)
- [ ] Complete Data Safety section
- [ ] Complete Content Rating questionnaire
- [ ] Fill out app category, contact details, target audience (13+)
- [ ] Upload AAB and submit for review

### Build & Signing
- [ ] Generate upload keystore
- [ ] Build release APK/AAB and test full flow on a real device

### Hosting & Config
- [ ] Enable GitHub Pages on your repo (Settings → Pages → select branch, folder: `/docs`)

### Database
- [ ] Remove test users from DB
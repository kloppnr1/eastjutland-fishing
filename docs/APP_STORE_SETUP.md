# App Store Setup Guide

This guide explains how to build and submit the Østjylland Lystfisker app to the Apple App Store.

## Prerequisites

1. **Apple Developer Program membership** ($99/year)
2. **App Store Connect access** (included with Developer Program)

## Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Østjylland Lystfisker
   - **Primary Language**: Danish
   - **Bundle ID**: dk.ostjylland.lystfiskerguide
   - **SKU**: ostjylland-lystfisker-001

## Step 2: Set Up GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

### For App Store Builds:

| Secret Name | Description |
|------------|-------------|
| `IOS_CERTIFICATE_P12` | Base64-encoded .p12 distribution certificate |
| `IOS_CERTIFICATE_PASSWORD` | Password for the .p12 certificate |
| `APP_STORE_CONNECT_ISSUER_ID` | From App Store Connect → Users → Keys |
| `APP_STORE_CONNECT_KEY_ID` | API Key ID from App Store Connect |
| `APP_STORE_CONNECT_PRIVATE_KEY` | Contents of the .p8 API key file |

### How to get these:

#### Distribution Certificate (.p12):
1. Open Keychain Access on a Mac (or use a cloud Mac service)
2. Go to Apple Developer Portal → Certificates
3. Create a new "Apple Distribution" certificate
4. Download and install it
5. Export from Keychain as .p12
6. Base64 encode: `base64 -i certificate.p12 | pbcopy`

#### App Store Connect API Key:
1. Go to App Store Connect → Users and Access → Keys
2. Click **+** to create a new key
3. Name it (e.g., "GitHub Actions")
4. Select **Admin** access
5. Download the .p8 file (only available once!)
6. Note the Key ID and Issuer ID

## Step 3: Run the Build

1. Go to GitHub repo → **Actions** → **iOS Build**
2. Click **Run workflow**
3. Select build type:
   - **development**: Test build (no signing required)
   - **app-store**: Signed build for App Store

## Step 4: App Store Metadata

Before submitting, prepare in App Store Connect:

### Required:
- **App Name**: Østjylland Lystfisker
- **Subtitle**: Fiskesteder i Østjylland
- **Description**:
  ```
  Find de bedste fiskesteder i Østjylland med vand- og vejrdata i realtid.

  Funktioner:
  • Kort over fiskesteder i Djursland og Østjylland
  • Aktuel vandtemperatur
  • Vindforhold og vejrudsigt
  • Webcams fra udvalgte steder
  ```
- **Keywords**: fiskeri, lystfisker, østjylland, djursland, vandtemperatur, fiskesteder
- **Support URL**: Your website or GitHub repo
- **Privacy Policy URL**: Required - create one at your domain

### Screenshots:
- iPhone 6.7" (1290 x 2796 px) - iPhone 15 Pro Max
- iPhone 6.5" (1284 x 2778 px) - iPhone 14 Plus
- iPad Pro 12.9" (2048 x 2732 px)

### App Icon:
Already configured - generated automatically from `resources/icon.png`

## Step 5: Submit for Review

1. Upload build via GitHub Actions (app-store build type)
2. In App Store Connect, select the uploaded build
3. Fill in all required metadata
4. Submit for review

## Local Development (requires Mac)

If you have access to a Mac:

```bash
# Build web app and sync to iOS
npm run build:ios

# Open in Xcode
npx cap open ios
```

## Troubleshooting

### Build fails on GitHub Actions
- Check that all secrets are correctly set
- Verify certificate hasn't expired
- Check provisioning profile matches bundle ID

### App rejected by Apple
Common reasons:
- Missing privacy policy
- Crashes during review
- Incomplete metadata
- Guideline violations

## File Structure

```
/
├── capacitor.config.ts    # Capacitor configuration
├── ios-export-options.plist  # Export settings for App Store
├── resources/
│   ├── icon.png          # 1024x1024 app icon source
│   └── splash.png        # 2732x2732 splash screen
└── .github/workflows/
    └── ios-build.yml     # GitHub Actions workflow
```

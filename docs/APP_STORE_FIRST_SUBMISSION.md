# First Time App Store Submission Guide

Complete walkthrough for submitting Østjylland Lystfisker to the App Store.

---

## Part 0: Mac Setup (One-time)

### 0.1 Install Xcode

1. Open **App Store** on your Mac
2. Search for **Xcode**
3. Click **Get** / **Install** (it's free but large ~12GB)
4. Wait for download and installation
5. Open Xcode once and accept the license agreement

### 0.2 Install Xcode Command Line Tools

Open **Terminal** (Applications → Utilities → Terminal) and run:

```bash
xcode-select --install
```

Click "Install" when prompted.

### 0.3 Install Node.js

**Option A: Download installer (easiest)**
1. Go to [nodejs.org](https://nodejs.org)
2. Download the **LTS** version (green button)
3. Open the downloaded .pkg file
4. Follow the installer steps

**Option B: Using Homebrew**
```bash
# Install Homebrew first (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Node.js
brew install node
```

### 0.4 Verify Installation

Open Terminal and run:

```bash
node --version
npm --version
git --version
```

You should see version numbers for each. If any command fails, that tool isn't installed correctly.

---

## Part 1: Apple Developer Setup (One-time)

### 1.1 Verify Your Apple Developer Membership

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in with your Apple ID
3. You should see "Apple Developer Program" as active
4. If not enrolled yet, click "Enroll" ($99/year)

---

## Part 2: App Store Connect Setup

### 2.1 Create Your App

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer Apple ID
3. Click **My Apps**
4. Click the **+** button → **New App**
5. Fill in:

| Field | Value |
|-------|-------|
| Platform | iOS |
| Name | Østjylland Lystfisker |
| Primary Language | Danish |
| Bundle ID | Select "Register new Bundle ID" |
| SKU | ostjylland-lystfisker-2024 |

### 2.2 Register Bundle ID

If prompted to create a new Bundle ID:

1. Go to [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** to add new
3. Select **App IDs** → Continue
4. Select **App** → Continue
5. Fill in:
   - Description: `Østjylland Lystfisker`
   - Bundle ID: Select **Explicit**
   - Enter: `dk.ostjylland.lystfiskerguide`
6. Scroll down, you don't need any capabilities for now
7. Click **Continue** → **Register**

Now go back to App Store Connect and select this Bundle ID.

---

## Part 3: Build the App on Your Mac

### 3.1 Get the Code

```bash
# Clone the repository (if not already)
git clone https://github.com/kloppnr1/eastjutland-fishing.git
cd eastjutland-fishing

# Or if you already have it, just pull latest
git pull
```

### 3.2 Install and Build

```bash
# Install dependencies
npm install

# Build web app and create iOS project
npm run build:ios

# Generate app icons (if not done)
npm run icons:create
```

### 3.3 Open in Xcode

```bash
npx cap open ios
```

This opens Xcode with your project.

---

## Part 4: Configure Xcode

### 4.1 Set Up Signing

1. In Xcode, click on **App** in the left sidebar (the blue icon at the top)
2. Select the **App** target (not the project)
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (your Apple Developer account)
6. Xcode will automatically create certificates and provisioning profiles

### 4.2 Set App Version

1. Still in the **General** tab
2. Set **Version** to `1.0.0`
3. Set **Build** to `1`

### 4.3 Set Deployment Target

1. In **General** tab
2. Set **Minimum Deployments** → iOS 14.0 or higher

### 4.4 Update Display Name (Optional)

1. In **General** tab
2. **Display Name**: `Lystfisker` (shorter name shown under icon)

---

## Part 5: Test Your App

### 5.1 Run on Simulator

1. In Xcode toolbar, select a simulator (e.g., "iPhone 15")
2. Click the **▶** Play button
3. App should build and launch in simulator
4. Test all features work correctly

### 5.2 Run on Real Device (Recommended)

1. Connect your iPhone via USB
2. Trust the computer on your phone if prompted
3. Select your phone in the device dropdown
4. Click **▶** Play
5. First time: Go to iPhone Settings → General → VPN & Device Management → Trust your developer certificate

---

## Part 6: Create App Store Screenshots

You need screenshots in specific sizes. Easiest method:

### 6.1 Using Simulator

1. Run app in these simulators and take screenshots (Cmd+S):
   - **iPhone 15 Pro Max** (6.7" - required)
   - **iPhone 15 Plus** (6.5" - required)
   - **iPad Pro 12.9"** (optional but recommended)

2. Take screenshots of:
   - Map view with badges visible
   - Expanded fish spot with weather data
   - DateTime picker open
   - A spot detail page

### 6.2 Screenshot Locations

Screenshots are saved to your Desktop. You'll need:
- 3-5 screenshots per device size

---

## Part 7: Archive and Upload

### 7.1 Create Archive

1. In Xcode, select **Any iOS Device** (not a simulator)
2. Menu: **Product** → **Archive**
3. Wait for build to complete (few minutes)
4. **Organizer** window opens automatically

### 7.2 Upload to App Store

1. In Organizer, select your archive
2. Click **Distribute App**
3. Select **App Store Connect** → Next
4. Select **Upload** → Next
5. Keep default options → Next
6. Select your distribution certificate (auto-created) → Next
7. Click **Upload**
8. Wait for upload and processing (5-15 minutes)

---

## Part 8: Complete App Store Listing

### 8.1 Go to App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps
2. Click on your app

### 8.2 Fill in App Information

Go to **App Information** in sidebar:

| Field | Value |
|-------|-------|
| Subtitle | Fiskesteder i Østjylland |
| Category | Sports (or Weather) |
| Content Rights | Does not contain third-party content |

### 8.3 Fill in Pricing

Go to **Pricing and Availability**:
- Price: Free
- Availability: All countries (or select Denmark only)

### 8.4 Add Version Information

Go to **iOS App** → your version:

**Description (Danish):**
```
Find de bedste fiskesteder i Østjylland med vejrdata i realtid.

• Interaktivt kort over fiskesteder
• Aktuel vandtemperatur
• Vindretning og vindhastighed
• Vejrudsigt time for time
• Webcams fra udvalgte steder

Perfekt til lystfiskere i Djursland og omegn.
```

**Keywords:**
```
fiskeri,lystfisker,østjylland,djursland,vandtemperatur,fiskesteder,vejr,fiskevejr,havørred
```

**Support URL:**
```
https://github.com/kloppnr1/eastjutland-fishing
```

**Marketing URL (optional):**
Leave blank or your website

### 8.5 Upload Screenshots

1. Scroll to **Screenshots** section
2. Upload for each device size (drag and drop)
3. Arrange in order you want them shown

### 8.6 Add App Icon

Should be automatic from your build. If not, the icon is at `resources/icon.png`

### 8.7 Privacy Policy

**Required!** Create a simple privacy policy. Options:

1. **Free generator**: Use [freeprivacypolicy.com](https://www.freeprivacypolicy.com)
2. **Simple version**: Host on GitHub Pages or your domain

Example privacy text:
```
Østjylland Lystfisker Privacy Policy

This app does not collect any personal data.
Weather data is fetched from public APIs (Open-Meteo).
No user accounts or tracking is used.

Contact: [your email]
```

Host this somewhere and add the URL to App Store Connect.

### 8.8 App Privacy

In **App Privacy** section:
- Click **Get Started**
- Select **No, we do not collect data**
- Save

---

## Part 9: Submit for Review

### 9.1 Select Build

1. In your app version page, scroll to **Build**
2. Click **+** and select your uploaded build
3. If build isn't showing, wait 10-15 minutes for processing

### 9.2 Answer Review Questions

- **Export Compliance**: Select "No" (app doesn't use encryption beyond HTTPS)
- **Content Rights**: Confirm you have rights to all content
- **Advertising Identifier**: Select "No"

### 9.3 Submit

1. Click **Add for Review** (top right)
2. Click **Submit to App Review**

---

## Part 10: Wait for Review

- **First submission**: Usually 24-48 hours
- You'll get email when approved or if there are issues
- Most common rejections:
  - Missing privacy policy
  - App crashes
  - Incomplete metadata
  - Placeholder content

---

## Quick Reference Commands

```bash
# Full build and open Xcode
npm run build:ios && npx cap open ios

# Just sync changes (after code updates)
npx cap sync ios

# Regenerate icons
npm run icons:create
```

---

## Troubleshooting

### "No signing certificate"
- In Xcode → Preferences → Accounts → Download Manual Profiles
- Or let Xcode manage signing automatically

### "Bundle ID already exists"
- Someone already registered this ID
- Change to something unique like `dk.yourname.lystfiskerguide`

### Build fails
- Clean build: Product → Clean Build Folder (Shift+Cmd+K)
- Try again

### App rejected
- Read the rejection reason carefully
- Fix the issue
- Increment build number
- Archive and upload again
- Resubmit

---

Good luck! 🎣

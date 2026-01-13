# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Setup

### Step 1: Create the Custom View Controller

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. In Xcode sidebar, right-click **App → App** folder → **New File...**

3. Choose **Swift File** → Next → Name it `BounceViewController` → Create

4. Click **Don't Create** if asked about bridging header

5. Replace file contents with:
   ```swift
   import UIKit
   import Capacitor

   class BounceViewController: CAPBridgeViewController {
       override func viewDidAppear(_ animated: Bool) {
           super.viewDidAppear(animated)
           webView?.scrollView.bounces = true
           webView?.scrollView.alwaysBounceVertical = true
       }
   }
   ```

### Step 2: Update the Storyboard

1. In Xcode sidebar, open **App → App → Main.storyboard**

2. Click on the **View Controller** (the main rectangle in the canvas)

3. Open the **Identity Inspector** (right panel, 3rd icon from left, or Cmd+Option+3)

4. Under **Custom Class**, change **Class** from `CAPBridgeViewController` to `BounceViewController`

5. Press Enter to confirm

### Step 3: Build and Run

Press **Cmd+R** to build and run.

## Why This Works

- The storyboard defines which view controller class to use
- By changing it there, we don't fight with AppDelegate/SceneDelegate initialization
- `viewDidAppear` is called after the webView is fully ready, so we can safely modify it

## Troubleshooting

**Can't find Main.storyboard**
- Look in App → App folder in the sidebar
- Make sure you're in the Project Navigator (Cmd+1)

**Class not showing in dropdown**
- Make sure BounceViewController.swift compiles without errors
- Try building first (Cmd+B) then go back to storyboard

**Bounce still not working**
- Clean build: Product → Clean Build Folder (Shift+Cmd+K)
- Delete app from device/simulator
- Rebuild and run

**Changes lost after npm run build:ios**
- The ios/ folder is preserved by `cap sync`, your changes will persist

# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Quick Setup

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode's left sidebar, right-click on **App → App** folder

3. Select **New File...**

4. Choose **Swift File**, click Next

5. Name it `BridgeExtension.swift`, click Create

6. If prompted about bridging header, click **Don't Create**

7. Replace the file contents with:
   ```swift
   import Capacitor

   extension CAPBridgeViewController {
       open override func viewDidAppear(_ animated: Bool) {
           super.viewDidAppear(animated)
           webView?.scrollView.bounces = true
           webView?.scrollView.alwaysBounceVertical = true
       }
   }
   ```

8. Press **Cmd+R** to build and run

Done! The app should now have the native iOS bounce effect.

## Troubleshooting

**Build error: "Cannot find type CAPBridgeViewController"**
- Make sure you have `import Capacitor` at the top

**Bounce still not working**
- Clean build: **Product → Clean Build Folder** (Shift+Cmd+K)
- Rebuild and run again

**Changes lost after `cap sync`**
- The `ios/` folder is not overwritten by sync, so your Swift code persists

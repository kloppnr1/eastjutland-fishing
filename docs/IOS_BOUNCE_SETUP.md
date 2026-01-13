# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Setup

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. Open **App → App → AppDelegate.swift**

3. Replace the **entire file** with:
   ```swift
   import UIKit
   import Capacitor

   class BounceViewController: CAPBridgeViewController {
       override func viewDidLoad() {
           super.viewDidLoad()
           DispatchQueue.main.async {
               self.webView?.scrollView.bounces = true
               self.webView?.scrollView.alwaysBounceVertical = true
           }
       }
   }

   @UIApplicationMain
   class AppDelegate: UIResponder, UIApplicationDelegate {
       var window: UIWindow?

       func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
           self.window?.rootViewController = BounceViewController()
           self.window?.makeKeyAndVisible()
           return true
       }
   }
   ```

4. Press **Cmd+R** to build and run

Delete any `MyViewController.swift` or `BridgeExtension.swift` files you created earlier.

## Troubleshooting

**Bounce still not working**
- Clean build: **Product → Clean Build Folder** (Shift+Cmd+K)
- Rebuild and run

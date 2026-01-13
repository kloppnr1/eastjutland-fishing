# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Setup

### Step 1: Create Custom View Controller

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode's left sidebar, right-click on **App → App** folder

3. Select **New File...**

4. Choose **Swift File**, click Next

5. Name it `MyViewController.swift`, click Create

6. If prompted about bridging header, click **Don't Create**

7. Replace the file contents with:
   ```swift
   import UIKit
   import Capacitor

   class MyViewController: CAPBridgeViewController {
       override func viewDidLoad() {
           super.viewDidLoad()

           // Enable bounce effect
           DispatchQueue.main.async {
               self.webView?.scrollView.bounces = true
               self.webView?.scrollView.alwaysBounceVertical = true
           }
       }
   }
   ```

### Step 2: Update AppDelegate

1. Open **App → App → AppDelegate.swift**

2. Find the `application` function (around line 6)

3. Replace it with:
   ```swift
   func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
       self.window?.rootViewController = MyViewController()
       self.window?.makeKeyAndVisible()
       return true
   }
   ```

### Step 3: Build and Run

Press **Cmd+R** to build and run.

## Troubleshooting

**Build error: "Cannot find type CAPBridgeViewController"**
- Make sure you have `import Capacitor` at the top

**Build error: "Value of type 'AppDelegate' has no member 'window'"**
- Add this property to AppDelegate class:
  ```swift
  var window: UIWindow?
  ```

**Bounce still not working**
- Clean build: **Product → Clean Build Folder** (Shift+Cmd+K)
- Rebuild and run again

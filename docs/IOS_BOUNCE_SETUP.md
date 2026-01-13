# Enable iOS Bounce Effect

This guide explains how to enable the bounce (rubber-band) effect when scrolling in the iOS app.

## Steps

### 1. Open the iOS project in Xcode

```bash
cd eastjutland-fishing
npx cap open ios
```

### 2. Find or create the custom ViewController

In Xcode's left sidebar, navigate to:
```
App → App → (right-click) → New File...
```

Select **Swift File** and name it `MyViewController.swift`

### 3. Add the following code

```swift
import UIKit
import Capacitor

class MyViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Enable bounce effect
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
    }
}
```

### 4. Update AppDelegate to use the custom ViewController

Open `App/App/AppDelegate.swift` and modify the `application` function:

Find this line (around line 13):
```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    return true
}
```

Replace with:
```swift
func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Set custom view controller
    self.window?.rootViewController = MyViewController()
    return true
}
```

### 5. Build and run

Press **Cmd+R** in Xcode to build and run on your device.

---

## Alternative: Modify existing ViewController

If you prefer not to create a new file, you can edit the existing setup.

### Option A: Using SceneDelegate (iOS 13+)

Open `App/App/SceneDelegate.swift` (if it exists) and add:

```swift
func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }

    let window = UIWindow(windowScene: windowScene)
    let vc = CAPBridgeViewController()
    window.rootViewController = vc
    self.window = window
    window.makeKeyAndVisible()

    // Enable bounce after a short delay to ensure webView is loaded
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        vc.webView?.scrollView.bounces = true
        vc.webView?.scrollView.alwaysBounceVertical = true
    }
}
```

### Option B: Using a Bridge extension

Create a new file `App/App/BridgeExtension.swift`:

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

This automatically applies to all Capacitor view controllers.

---

## Troubleshooting

### Bounce still not working

1. Make sure you rebuilt the app after making changes (Cmd+R)
2. Check that the code is actually being executed (add a print statement)
3. Try `alwaysBounceVertical = true` in addition to `bounces = true`

### Build errors

If you get Swift errors:
- Make sure you imported `Capacitor` at the top of the file
- Check that the class inherits from `CAPBridgeViewController`

### Changes not persisting after `cap sync`

The iOS folder is not overwritten by `cap sync`, so your custom Swift code will persist.

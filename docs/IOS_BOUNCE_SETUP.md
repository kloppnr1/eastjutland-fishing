# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Current Setup (Plugin)

This project uses [capacitor-plugin-ios-webview-configurator](https://github.com/cellular/capacitor-plugin-ios-webview-configurator).

Already configured in `client/src/main.tsx`:

```typescript
if (Capacitor.getPlatform() === "ios") {
  import("capacitor-plugin-ios-webview-configurator").then(({ setWebviewBounce }) => {
    setWebviewBounce(true);
  });
}
```

Just rebuild with `npm run build:ios` and run.

---

## Alternative: Objective-C Override

If the plugin doesn't work, use this native approach:

1. Open the iOS project:
   ```bash
   npx cap open ios
   ```

2. Right-click **App → App** → **New File...**

3. Choose **Objective-C File** → Name it `EnableBounce` → Create

4. If asked about bridging header, click **Create Bridging Header**

5. Replace file contents with:
   ```objc
   #import <Foundation/Foundation.h>
   #import <UIKit/UIKit.h>

   @implementation UIScrollView (EnableBounce)
   - (void)didMoveToWindow {
       [super didMoveToWindow];
       self.bounces = YES;
       self.alwaysBounceVertical = YES;
   }
   @end
   ```

6. Build and run (Cmd+R)

This overrides `didMoveToWindow` on ALL UIScrollViews, including WKWebView's internal scroll view.

## Sources

- [Capacitor Discussion #4206](https://github.com/ionic-team/capacitor/discussions/4206)
- [capacitor-plugin-ios-webview-configurator](https://github.com/cellular/capacitor-plugin-ios-webview-configurator)
- [Capacitor Issue #2334](https://github.com/ionic-team/capacitor/issues/2334)

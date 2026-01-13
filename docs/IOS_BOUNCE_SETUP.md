# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Setup (Objective-C Override)

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

## How It Works

This creates an Objective-C category on `UIScrollView` that overrides `didMoveToWindow`. When any scroll view (including WKWebView's internal scroll view) is added to a window, bounce is enabled.

## Notes

- Changes persist across `npm run build:ios` and `npx cap sync`
- The ios/ folder is not overwritten by Capacitor

## Sources

- [Capacitor Discussion #4206](https://github.com/ionic-team/capacitor/discussions/4206)
- [Capacitor Issue #2334](https://github.com/ionic-team/capacitor/issues/2334)

# Enable iOS Bounce Effect

Enable the native iOS bounce (rubber-band) effect when scrolling.

## Option 1: Plugin (Recommended)

Use the [capacitor-plugin-ios-webview-configurator](https://github.com/niceplugin/capacitor-plugin-ios-webview-configurator) plugin:

```bash
npm install capacitor-plugin-ios-webview-configurator
npx cap sync
```

Then in your app's main entry (e.g., `main.tsx`):

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'ios') {
  import('capacitor-plugin-ios-webview-configurator').then(({ setWebviewBounce }) => {
    setWebviewBounce(true);
  });
}
```

Rebuild with `npm run build:ios` and run.

## Option 2: Objective-C Override

If you prefer not to add a plugin, create an Objective-C file:

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

## Sources

- [Capacitor Discussion #4206](https://github.com/ionic-team/capacitor/discussions/4206)
- [capacitor-plugin-ios-webview-configurator](https://github.com/cellular/capacitor-plugin-ios-webview-configurator)
- [Capacitor Issue #2334](https://github.com/ionic-team/capacitor/issues/2334)

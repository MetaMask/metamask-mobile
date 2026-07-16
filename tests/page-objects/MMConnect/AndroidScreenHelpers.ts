import { encapsulatedAction, sleep, createLogger } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { APP_PACKAGE_IDS } from '../../framework/Constants';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightUtilities, {
  getDriver,
} from '../../framework/PlaywrightUtilities';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';

const logger = createLogger({
  name: 'AndroidScreenHelpers',
});

/** MetaMask label in Android app chooser (CI often shows lowercase "metamask"). */
const CHOOSER_METAMASK_XPATHS = [
  `//android.widget.TextView[translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='metamask' and not(ancestor::android.webkit.WebView)]`,
  `//*[@resource-id="android:id/text1" and translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='metamask']`,
  `//android.widget.Button[translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='metamask']`,
  `//*[translate(@content-desc, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='metamask']`,
  // Resolve-info row: text may be nested under list item
  `//*[@resource-id="android:id/list"]//*[translate(@text, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='metamask']`,
];

const JUST_ONCE_XPATHS = [
  '//android.widget.Button[@resource-id="android:id/button_once"]',
  '//android.widget.Button[@text="Just once"]',
  '//*[@text="Just once"]',
];

const CHOOSER_TIMEOUT_MS = 20_000;
const POLL_MS = 500;

class AndroidScreenHelpers {
  get openDeeplinkWithMetaMask(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(CHOOSER_METAMASK_XPATHS[0]),
    });
  }

  /**
   * After a dapp deeplink, select MetaMask from the Android app chooser.
   * On CI emulators MetaMask is often the only handler, so Android skips the
   * chooser and opens the app directly — treat that as success. Also collapse
   * the status bar so Play services heads-up toasts do not block taps.
   */
  async tapOpenDeeplinkWithMetaMask(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        PlaywrightUtilities.collapseStatusBar();

        const deadline = Date.now() + CHOOSER_TIMEOUT_MS;
        while (Date.now() < deadline) {
          PlaywrightUtilities.collapseStatusBar();

          if (await this.isMetaMaskForeground()) {
            logger.debug(
              'MetaMask already foreground after deeplink; skipping chooser',
            );
            return;
          }

          for (const xpath of CHOOSER_METAMASK_XPATHS) {
            try {
              const option = await PlaywrightMatchers.getElementByXPath(xpath);
              if (await option.isVisible()) {
                await PlaywrightGestures.waitAndTap(option, {
                  timeout: 3_000,
                  delay: 200,
                });
                await this.tapJustOnceIfPresent();
                return;
              }
            } catch {
              // Try next selector
            }
          }

          await sleep(POLL_MS);
        }

        throw new Error(
          `Android MetaMask deeplink chooser not shown (and MetaMask not foreground) after ${CHOOSER_TIMEOUT_MS}ms`,
        );
      },
    });
  }

  private async isMetaMaskForeground(): Promise<boolean> {
    try {
      const currentPackage = (await getDriver().execute(
        'mobile: getCurrentPackage',
      )) as string;
      if (
        currentPackage === APP_PACKAGE_IDS.ANDROID ||
        currentPackage?.startsWith(`${APP_PACKAGE_IDS.ANDROID}.`)
      ) {
        return true;
      }
    } catch {
      // Ignore package probe failures
    }

    try {
      const connectButton = await PlaywrightMatchers.getElementById(
        ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
      );
      return await connectButton.isVisible();
    } catch {
      return false;
    }
  }

  private async tapJustOnceIfPresent(): Promise<void> {
    for (const xpath of JUST_ONCE_XPATHS) {
      try {
        const button = await PlaywrightMatchers.getElementByXPath(xpath);
        if (await button.isVisible()) {
          await PlaywrightGestures.waitAndTap(button, {
            timeout: 2_000,
            delay: 100,
          });
          return;
        }
      } catch {
        // Not present
      }
    }
  }
}

export default new AndroidScreenHelpers();

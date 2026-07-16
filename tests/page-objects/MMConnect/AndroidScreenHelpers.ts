import { encapsulatedAction, sleep, createLogger } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightUtilities from '../../framework/PlaywrightUtilities';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import { unlockIfLockScreenVisible } from './unlockHelpers';

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

const CHOOSER_TIMEOUT_MS = 45_000;
const POLL_MS = 500;

class AndroidScreenHelpers {
  get openDeeplinkWithMetaMask(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(CHOOSER_METAMASK_XPATHS[0]),
    });
  }

  /**
   * After a dapp deeplink, select MetaMask from the Android app chooser (if
   * shown) and wait for the connect sheet. Auto-lock often appears instead of
   * the sheet — unlock when the password screen is visible, then keep waiting.
   */
  async tapOpenDeeplinkWithMetaMask(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        PlaywrightUtilities.collapseStatusBar();

        const deadline = Date.now() + CHOOSER_TIMEOUT_MS;
        while (Date.now() < deadline) {
          PlaywrightUtilities.collapseStatusBar();

          await unlockIfLockScreenVisible();

          if (await this.isConnectSheetVisible()) {
            logger.debug(
              'MetaMask connect sheet already visible; skipping chooser',
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
                // After chooser, lock screen or connect sheet may appear.
                const sheetDeadline = Date.now() + 20_000;
                while (Date.now() < sheetDeadline) {
                  await unlockIfLockScreenVisible();
                  if (await this.isConnectSheetVisible()) {
                    return;
                  }
                  await sleep(POLL_MS);
                }
                throw new Error(
                  'Tapped MetaMask in Android deeplink chooser, but connect sheet did not appear within 20s',
                );
              }
            } catch {
              // Try next selector
            }
          }

          await sleep(POLL_MS);
        }

        throw new Error(
          `Android MetaMask deeplink chooser / connect sheet not shown after ${CHOOSER_TIMEOUT_MS}ms`,
        );
      },
    });
  }

  private async isConnectSheetVisible(): Promise<boolean> {
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

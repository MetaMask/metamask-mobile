import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import { type AppiumElement } from '../../framework';

class DeeplinkModal {
  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByText('Continue');
  }

  get proceedWithCaution(): Promise<AppiumElement> {
    return Matchers.getElementByText('Proceed with caution');
  }

  get nftFullViewTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText('NFTs');
  }

  private async isElementPresent(
    target: Promise<AppiumElement>,
  ): Promise<boolean> {
    const el = await target;
    const exists = await el.unwrap().isExisting();
    if (!exists) {
      return false;
    }
    return el.isVisible();
  }

  /**
   * Wait for the PUBLIC DeepLink interstitial, then tap Continue.
   * Prefer title readiness over tapping Continue alone — stacked destination
   * screens can leave Continue missing until the interstitial actually mounts.
   *
   * When `destinationVisible` is provided, return without tapping if the
   * destination is already on screen (iOS intermittently skips the interstitial
   * after prior PUBLIC deeplinks / sheet dismiss races).
   */
  async tapContinue(options?: {
    timeout?: number;
    destinationVisible?: () => Promise<AppiumElement>;
  }): Promise<void> {
    const timeout = options?.timeout ?? 20_000;
    let interstitialShown = false;

    await Utilities.waitUntil(
      async () => {
        if (await this.isElementPresent(this.proceedWithCaution)) {
          interstitialShown = true;
          return true;
        }
        if (options?.destinationVisible) {
          if (await this.isElementPresent(options.destinationVisible())) {
            return true;
          }
        }
        return false;
      },
      { timeout, interval: 300 },
    );

    if (!interstitialShown) {
      return;
    }

    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Deeplink Modal Continue Button',
      timeout: 15_000,
    });
  }

  /**
   * NFT PUBLIC deeplink: accept either the interstitial or NFTs already visible.
   */
  async tapContinueOrNftDestination(options?: {
    timeout?: number;
  }): Promise<void> {
    await this.tapContinue({
      timeout: options?.timeout,
      destinationVisible: () => this.nftFullViewTitle,
    });
  }
}

export default new DeeplinkModal();

import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulatedAction,
  Gestures,
  PlaywrightGestures,
} from '../../framework';

class OnboardingView {
  get container(): DetoxElement {
    return Matchers.getElementByID(OnboardingSelectorIDs.CONTAINER_ID);
  }

  get existingWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSelectorIDs.EXISTING_WALLET_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.EXISTING_WALLET_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  get newWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(OnboardingSelectorIDs.NEW_WALLET_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          OnboardingSelectorIDs.NEW_WALLET_BUTTON,
          {
            exact: true,
          },
        ),
    });
  }

  async tapCreateWallet(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.newWalletButton), {
          elemDescription: 'Onboarding Create New Wallet Button',
        });
      },
      appium: async () => {
        const elem = await asPlaywrightElement(this.newWalletButton);
        await PlaywrightGestures.waitForElementStable(elem);

        // Re-fetch to avoid stale reference after stability wait
        const freshElem = await asPlaywrightElement(this.newWalletButton);
        await freshElem.unwrap().click();
      },
    });
  }

  async tapCreateNewWalletButton(): Promise<void> {
    await this.tapCreateWallet();
  }

  async tapHaveAnExistingWallet() {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.existingWalletButton), {
          elemDescription: 'Onboarding Have an Existing Wallet Button',
        });
      },
      appium: async () => {
        // Wait for element to be stable and JS bridge to be ready
        const elem = await asPlaywrightElement(this.existingWalletButton);
        await PlaywrightGestures.waitForElementStable(elem);

        // Appium is tapping faster than the element is ready to be tapped on
        // even after checking for stability so we need to re-fetch the element
        const freshElem = await asPlaywrightElement(this.existingWalletButton);
        await freshElem.unwrap().click();
      },
    });
  }
}

export default new OnboardingView();

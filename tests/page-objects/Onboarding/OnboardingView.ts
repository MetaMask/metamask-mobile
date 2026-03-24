import { OnboardingSelectorIDs } from '../../../app/components/Views/Onboarding/Onboarding.testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

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
        ),
    });
  }

  async tapCreateWallet(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.newWalletButton, {
      description: 'Onboarding - Create New Wallet Button',
    });
  }

  async tapHaveAnExistingWallet(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.existingWalletButton, {
      description: 'Onboarding Have an Existing Wallet Button',
    });
  }

  async isScreenTitleVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.newWalletButton);
        await el.waitForDisplayed({ timeout: 30000 });
      },
    });
  }
}

export default new OnboardingView();

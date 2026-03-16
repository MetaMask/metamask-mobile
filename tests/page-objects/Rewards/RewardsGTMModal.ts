import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';

class RewardsGTMModal {
  get notNowButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementById(REWARDS_VIEW_SELECTORS.SKIP_BUTTON),
    });
  }

  get container(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getElementByCatchAll('Rewards are here'),
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const el = await asPlaywrightElement(this.container);
        await el.waitForDisplayed();
      },
    });
  }

  async tapNotNowButton(): Promise<void> {
    await UnifiedGestures.tap(this.notNowButton, {
      description: 'Rewards GTM Not Now Button',
    });
  }
}

export default new RewardsGTMModal();

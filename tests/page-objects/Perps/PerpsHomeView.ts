import { PerpsHomeViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import enContent from '../../../locales/languages/en.json';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class PerpsHomeView {
  get exploreCrypto(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(enContent.perps.home.crypto),
      appium: () =>
        PlaywrightMatchers.getElementByText(enContent.perps.home.crypto),
    });
  }

  get backHome(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON,
        ),
    });
  }

  async tapExploreCrypto(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.exploreCrypto, {
      elemDescription: 'Perps Explore Crypto Button',
    });
  }

  async tapExploreCryptoIfVisible(): Promise<void> {
    const isVisible = await Utilities.isElementVisible(
      this.exploreCrypto,
      1500,
    );
    if (isVisible) {
      await UnifiedGestures.waitAndTap(this.exploreCrypto, {
        elemDescription: 'Perps Explore Crypto Button',
      });
    }
  }

  async tapBackHomeButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.backHome, {
      elemDescription: 'Perps Back Home Button',
    });
  }
}

export default new PerpsHomeView();

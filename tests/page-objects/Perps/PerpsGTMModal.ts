import { PerpsGTMModalSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class PerpsGTMModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL,
        ),
    });
  }

  get notNowButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
        ),
    });
  }

  get getStartedButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PerpsGTMModalSelectorsIDs.PERPS_TRY_NOW_BUTTON,
        ),
    });
  }

  async tapNotNowButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notNowButton, {
      description: 'Perps GTM Not Now Button',
    });
  }

  async tapGetStartedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getStartedButton, {
      description: 'Perps GTM Get Started Button',
    });
  }
}

export default new PerpsGTMModal();

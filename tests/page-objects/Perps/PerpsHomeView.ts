import { PerpsHomeViewSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import enContent from '../../../locales/languages/en.json';
import { EncapsulatedElementType } from '../../framework';

class PerpsHomeView {
  get exploreCrypto(): EncapsulatedElementType {
    return Matchers.getElementByText(enContent.perps.home.crypto);
  }

  get backHome(): EncapsulatedElementType {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON);
  }

  async tapExploreCrypto(): Promise<void> {
    await Gestures.waitAndTap(this.exploreCrypto, {
      elemDescription: 'Perps Explore Crypto Button',
    });
  }

  async tapExploreCryptoIfVisible(): Promise<void> {
    const isVisible = await Utilities.isElementVisible(
      this.exploreCrypto,
      1500,
    );
    if (isVisible) {
      await Gestures.waitAndTap(this.exploreCrypto, {
        elemDescription: 'Perps Explore Crypto Button',
      });
    }
  }

  async tapBackHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.backHome, {
      elemDescription: 'Perps Back Home Button',
    });
  }
}

export default new PerpsHomeView();

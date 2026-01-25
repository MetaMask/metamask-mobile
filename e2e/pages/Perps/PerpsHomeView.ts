import { PerpsHomeViewSelectorsIDs } from '../../selectors/Perps/Perps.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import enContent from '../../../locales/languages/en.json';

class PerpsHomeView {
  get exploreCrypto(): DetoxElement {
    return Matchers.getElementByText(enContent.perps.home.crypto);
  }

  get backHome(): DetoxElement {
    return Matchers.getElementByID(PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON);
  }

  async tapExploreCrypto(): Promise<void> {
    await Gestures.waitAndTap(this.exploreCrypto, {
      elemDescription: 'Perps Explore Crypto Button',
    });
  }

  async tapBackHomeButton(): Promise<void> {
    await Gestures.waitAndTap(this.backHome, {
      elemDescription: 'Perps Back Home Button',
    });
  }
}

export default new PerpsHomeView();

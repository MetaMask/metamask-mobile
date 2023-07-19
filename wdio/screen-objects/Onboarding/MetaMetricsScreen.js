import Gestures from '../../helpers/Gestures';
import {
  OPTIN_METRICS_I_AGREE_BUTTON_ID,
  OPTIN_METRICS_NO_THANKS_BUTTON_ID,
  OPTIN_METRICS_TITLE_ID,
} from '../testIDs/Screens/OptinMetricsScreen.testIds';
import Selectors from '../../helpers/Selectors';

class MetaMetricsScreen {
  get screenTitle() {
    return Selectors.getXpathElementByResourceId(OPTIN_METRICS_TITLE_ID);
  }

  get iAgreeButton() {
    return Selectors.getXpathElementByResourceId(
      OPTIN_METRICS_I_AGREE_BUTTON_ID,
    );
  }

  get noThanksButton() {
    return Selectors.getXpathElementByResourceId(
      OPTIN_METRICS_NO_THANKS_BUTTON_ID,
    );
  }

  async isScreenTitleVisible() {
    await expect(this.screenTitle).toBeDisplayed();
  }

  async swipeUp() {
    await Gestures.swipe({ x: 200, y: 1000 }, { x: 200, y: 10 });
  }

  async tapIAgreeButton() {
    const element = await this.iAgreeButton;
    await element.waitForDisplayed();
    await this.swipeUp();
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.iAgreeButton);
  }

  async tapNoThanksButton() {
    await this.swipeUp();
    const element = await this.iAgreeButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.noThanksButton);
  }
}

export default new MetaMetricsScreen();

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

  async tapIAgreeButton() {
    const element = await this.iAgreeButton;
    await element.waitForDisplayed();
    await Gestures.swipeUp(0.5);
    await Gestures.swipeUp(0.5);
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.iAgreeButton);
  }

  async tapNoThanksButton() {
    await Gestures.swipeUp(0.5);
    const element = await this.iAgreeButton;
    await element.waitForEnabled();
    await Gestures.waitAndTap(this.noThanksButton);
  }
}

export default new MetaMetricsScreen();

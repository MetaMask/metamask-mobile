import Gestures from '../helpers/Gestures';
import { OPTIN_METRICS_I_AGREE_BUTTON_ID, OPTIN_METRICS_TITLE_ID } from '../testIDs/Screens/OptinMetricsScreen.testIds';

class OptinMetricsScreen {
  get screenTitle() {
    return $(`~${OPTIN_METRICS_TITLE_ID}`);
  }

  async verifyScreenTitle() {
    await expect(this.screenTitle).toBeDisplayed();
  }

  async clickIAgreeButton() {
    const elem = $(`~${OPTIN_METRICS_I_AGREE_BUTTON_ID}`)
    await Gestures.tap(elem);
    await elem.waitForDisplayed({ reverse: true });
  }
}

export default new OptinMetricsScreen();


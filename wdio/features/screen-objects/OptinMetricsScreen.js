import { OPTIN_METRICS_I_AGREE_BUTTON_ID, OPTIN_METRICS_TITLE_ID } from '../testIDs/Screens/OptinMetricsScreen.testIds';

class OptinMetricsScreen {
  async verifyScreenTitle() {
    await expect(await $(`~${OPTIN_METRICS_TITLE_ID}`)).toBeDisplayed();
  }

  async clickIAgreeButton() {
    const elem = await $(`~${OPTIN_METRICS_I_AGREE_BUTTON_ID}`)
    await $(elem).click();
    await elem.waitForDisplayed({ reverse: true });
  }
}

export default new OptinMetricsScreen();


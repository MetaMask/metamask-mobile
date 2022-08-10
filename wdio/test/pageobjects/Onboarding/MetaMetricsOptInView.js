import Gestures from '../Gestures';

const METAMETRICS_OPT_IN_CONTAINER_ID = 'metaMetrics-OptIn';
const AGREE_BUTTON_ID = 'agree-button';
const NO_THANKS_BUTTON_ID = 'cancel-button';
class MetaMetricsOptIn {
  get agreeButton() {
    return $(`~${AGREE_BUTTON_ID}`);
  }
  get noThanksButton() {
    return $(`~${NO_THANKS_BUTTON_ID}`);
  }

  get metaMetricsContainer() {
    return $(`~${METAMETRICS_OPT_IN_CONTAINER_ID}`);
  }

  async tapAgreeButton() {
    await Gestures.waitAndTap(AGREE_BUTTON_ID);
  }

  async tapNoThanksButton() {
    await Gestures.waitAndTap(NO_THANKS_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.metaMetricsContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.metaMetricsContainer).not.toBeDisplayed();
  }
}
export default new MetaMetricsOptIn();

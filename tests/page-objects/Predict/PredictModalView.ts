import { PREDICT_GTM_MODAL_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictGTMModal/PredictGTMModal.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
  Matchers,
  PlaywrightMatchers,
  UnifiedGestures,
} from '../../framework';

class PredictModalView {
  get notNowButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(PREDICT_GTM_MODAL_TEST_IDS.NOT_NOW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          PREDICT_GTM_MODAL_TEST_IDS.NOT_NOW_BUTTON,
          { exact: true },
        ),
    });
  }

  async tapNotNowButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.notNowButton, {
      description: 'Predict Not Now Button',
    });
  }
}

export default new PredictModalView();

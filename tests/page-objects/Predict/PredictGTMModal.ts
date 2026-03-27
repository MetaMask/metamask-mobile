import { waitFor } from 'detox';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PREDICT_GTM_MODAL_TEST_IDS } from '../../../app/components/UI/Predict/components/PredictGTMModal/PredictGTMModal.testIds';

/**
 * Polymarket / Predict promo (GTM) modal shown after onboarding when the feature is enabled.
 */
class PredictGTMModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(PREDICT_GTM_MODAL_TEST_IDS.CONTAINER);
  }

  get notNowButton(): DetoxElement {
    return Matchers.getElementByID(PREDICT_GTM_MODAL_TEST_IDS.NOT_NOW_BUTTON);
  }

  /**
   * Dismisses the promo via **Not now** so the wallet home can appear. No-op if the modal is not shown.
   */
  async dismissIfVisible(): Promise<void> {
    try {
      const modalRoot = await Matchers.getElementByID(
        PREDICT_GTM_MODAL_TEST_IDS.CONTAINER,
      );
      await waitFor(modalRoot).toExist().withTimeout(2000);
      await Gestures.waitAndTap(this.notNowButton, {
        elemDescription: 'Predict GTM Not now button',
      });
    } catch {
      // Modal is feature-flagged or already dismissed
    }
  }
}

export default new PredictGTMModal();

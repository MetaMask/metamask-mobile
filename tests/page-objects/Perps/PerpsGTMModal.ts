import { waitFor } from 'detox';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PerpsGTMModalSelectorsIDs } from '../../../app/components/UI/Perps/Perps.testIds';

/**
 * Perps full-screen GTM / "what's new" promo (e.g. PERPS ARE HERE) shown when the feature is enabled.
 */
class PerpsGTMModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL);
  }

  get notNowButton(): DetoxElement {
    return Matchers.getElementByID(
      PerpsGTMModalSelectorsIDs.PERPS_NOT_NOW_BUTTON,
    );
  }

  /**
   * Dismisses via **Not now** so wallet home can appear. No-op if the modal is not shown.
   */
  async dismissIfVisible(): Promise<void> {
    try {
      const modalRoot = await Matchers.getElementByID(
        PerpsGTMModalSelectorsIDs.PERPS_GTM_MODAL,
      );
      await waitFor(modalRoot).toExist().withTimeout(2000);
      await Gestures.waitAndTap(this.notNowButton, {
        elemDescription: 'Perps GTM Not now button',
      });
    } catch {
      // Modal is feature-flagged or already dismissed
    }
  }
}

export default new PerpsGTMModal();

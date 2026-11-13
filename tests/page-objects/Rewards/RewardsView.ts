import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';
import Matchers from '../../framework/Matchers';
import type { AppiumElement } from '../../framework/AppiumElement';

/**
 * Rewards tab content surface.
 *
 * Opted-in and not-yet-joined accounts both land on the dashboard shell.
 * Permanent dashboard body content is still evolving, so performance gates
 * should treat the shell as "content ready".
 */
class RewardsView {
  get title(): Promise<AppiumElement> {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.TITLE);
  }

  get safeArea(): Promise<AppiumElement> {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.SAFE_AREA_VIEW);
  }

  get bottomSheetCloseButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      REWARDS_VIEW_SELECTORS.BOTTOM_SHEET_CLOSE_BUTTON,
    );
  }

  /**
   * The "Add accounts" confirm button inside the "Don't miss out" bottom-sheet
   * modal. Visible only when the modal is open, so it doubles as a modal-present
   * indicator. On Android the element is found via its accessibility label
   * (content-desc); on iOS via its accessibility ID.
   */
  get dontMissOutModalButton(): Promise<AppiumElement> {
    return Matchers.getElementByLabel('Add accounts');
  }
}

export default new RewardsView();

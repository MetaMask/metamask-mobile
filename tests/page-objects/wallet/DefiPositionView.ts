import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';

/**
 * Page Object for the DeFi position details screen (e.g. "Aave V3").
 * Covers the view shown after tapping a position from the DeFi list.
 */
class DefiPositionView {
  /** Main container of the position details screen */
  get container(): DetoxElement {
    return Matchers.getElementByID(
      WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER,
    );
  }

  /** Back arrow button in the navbar (navigates to DeFi list) */
  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  /**
   * Asserts that the position details screen is displayed:
   * main container and back button are visible.
   */
  async checkContainersIsDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'DeFi position details container should be visible',
    });
    await Assertions.expectElementToBeVisible(this.backButton, {
      description: 'DeFi position details back button should be visible',
    });
  }
}

export default new DefiPositionView();

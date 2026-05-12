import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';

class TokensFullView {
  /**
   * Back button in the tokens full view header
   */
  get backButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.BACK_BUTTON);
  }

  /**
   * Network filter button in the tokens full view control bar
   */
  get networkFilterButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  /**
   * Wait for the tokens full view to be visible
   */
  async waitForVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.backButton, {
      elemDescription: 'Tokens Full View back button',
      timeout: 10000,
    });
  }

  /**
   * Tap the back button to return to the homepage
   */
  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Tokens Full View back button',
    });
  }
}

export default new TokensFullView();

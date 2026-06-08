import { Assertions, Gestures, Matchers } from '../../framework';
import {
  WalletAssetSelectorsIDs,
  WalletAssetSelectorsRegex,
  WalletAssetSelectorsText,
} from '../../selectors/Wallet/WalletView.selectors';
import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';

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

  get stakedEthereumAssetRow(): DetoxElement {
    return Promise.resolve(
      element(
        by
          .id(WalletAssetSelectorsIDs.STAKED_ETHEREUM)
          .withDescendant(by.text(WalletViewSelectorsText.STAKED_ETHEREUM))
          .withDescendant(
            by.text(WalletAssetSelectorsText.STAKED_ETHEREUM_AMOUNT),
          )
          .withDescendant(by.text(WalletAssetSelectorsRegex.FIAT_BALANCE)),
      ),
    );
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

  async expectStakedEthereumRowWithBalancesVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.stakedEthereumAssetRow, {
      description: 'Staked Ethereum row should display token and fiat balances',
    });
  }
}

export default new TokensFullView();

import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { BALANCE_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';

const STAKED_ETHEREUM_ASSET_ID = 'asset-ETH';
const STAKED_ETHEREUM_LABEL = 'Staked Ethereum';
const STAKED_ETHEREUM_AMOUNT = '1 ETH';

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
          .id(STAKED_ETHEREUM_ASSET_ID)
          .withDescendant(by.text(STAKED_ETHEREUM_LABEL))
          .withDescendant(by.text(STAKED_ETHEREUM_AMOUNT))
          .withDescendant(by.id(BALANCE_TEST_ID)),
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

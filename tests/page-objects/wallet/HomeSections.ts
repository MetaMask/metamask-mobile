import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
  PlatformDetector,
} from '../../framework';
import { WalletAssetSelectorsIDs } from '../../../app/components/UI/AssetElement/AssetElement.testIds';
import { WalletAssetSelectorsText } from '../../selectors/Wallet/WalletView.selectors';
import {
  WalletViewSelectorsIDs,
  WalletViewSelectorsText,
} from '../../../app/components/Views/Wallet/WalletView.testIds';

class TokensFullView {
  /**
   * Back button in the tokens full view header
   */
  get backButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.BACK_BUTTON);
  }

  /**
   * Network filter button in the tokens full view control bar
   */
  get networkFilterButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  get stakedEthereumAssetRow(): Promise<AppiumElement> {
    const assetId = WalletAssetSelectorsIDs.STAKED_ETHEREUM;
    const stakedLabel = WalletViewSelectorsText.STAKED_ETHEREUM;
    const amountText = WalletAssetSelectorsText.STAKED_ETHEREUM_AMOUNT;

    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByIOSPredicate(
        `name == '${assetId}' AND (label CONTAINS '${stakedLabel}' OR value CONTAINS '${stakedLabel}') AND (label CONTAINS '${amountText}' OR value CONTAINS '${amountText}')`,
      );
    }
    return Matchers.getElementByNativeXPath(
      `//*[contains(@resource-id,'${assetId}')][descendant::*[@text='${stakedLabel}'] and descendant::*[@text='${amountText}']]`,
    );
  }

  /**
   * Wait for the tokens full view to be visible
   */
  async waitForVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.backButton, {
      description: 'Tokens Full View back button',
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
    if (PlatformDetector.isIOS()) {
      await Assertions.expectElementToBeVisible(
        Matchers.getElementByIOSPredicate(
          `label CONTAINS '${WalletViewSelectorsText.STAKED_ETHEREUM}' OR value CONTAINS '${WalletViewSelectorsText.STAKED_ETHEREUM}'`,
        ),
        {
          description: 'Staked Ethereum label should be visible',
          timeout: 60000,
        },
      );
      await Assertions.expectElementToBeVisible(
        Matchers.getElementByIOSPredicate(
          `name == '${WalletAssetSelectorsIDs.STAKED_ETHEREUM}' AND (label CONTAINS '${WalletAssetSelectorsText.STAKED_ETHEREUM_AMOUNT}' OR value CONTAINS '${WalletAssetSelectorsText.STAKED_ETHEREUM_AMOUNT}')`,
        ),
        {
          description: 'Staked Ethereum amount (1 ETH) should be visible',
          timeout: 30000,
        },
      );
      return;
    }

    await Assertions.expectTextDisplayed(
      WalletViewSelectorsText.STAKED_ETHEREUM,
      {
        timeout: 60000,
        description: 'Staked Ethereum label should be visible',
      },
    );
    await Assertions.expectTextDisplayed(
      WalletAssetSelectorsText.STAKED_ETHEREUM_AMOUNT,
      {
        timeout: 30000,
        description: 'Staked Ethereum amount (1 ETH) should be visible',
      },
    );
  }
}

export default new TokensFullView();

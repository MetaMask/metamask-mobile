import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import NetworkManager from './NetworkManager';
import { EncapsulatedElementType } from '../../framework';

class TokensView {
  get networkFilter(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  earnCtaForToken(tokenSymbol: string): EncapsulatedElementType {
    return Matchers.getElementIDWithAncestor(
      SECONDARY_BALANCE_BUTTON_TEST_ID,
      getAssetTestId(tokenSymbol),
    );
  }

  async tapNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.networkFilter, {
      elemDescription: 'Token Network Filter',
    });
  }

  async tapAllPopularNetworks(): Promise<void> {
    await NetworkManager.tapSelectAllPopularNetworks();
  }

  async tapEarnCta(): Promise<void> {
    await Gestures.waitAndTap(this.earnCtaForToken('USDC'), {
      checkStability: true,
      elemDescription: 'Earn CTA on USDC token row',
    });
  }

  /**
   * Wait for a token row to display a non-zero balance.
   * Useful when the balance is seeded on an Anvil fork and the app needs
   * time to refresh from the chain before the UI reflects it.
   */
  async waitForTokenBalance(
    tokenSymbol: string,
    timeout = 30000,
  ): Promise<void> {
    const assetTestId = getAssetTestId(tokenSymbol);
    const zeroBalance = element(
      by.text(`0 ${tokenSymbol}`).withAncestor(by.id(assetTestId)),
    );
    await waitFor(zeroBalance).not.toBeVisible().withTimeout(timeout);
  }

  async tapToken(tokenSymbol: string): Promise<void> {
    const elem = Matchers.getElementByID(getAssetTestId(tokenSymbol));
    await Utilities.waitForElementToStopMoving(elem, {
      timeout: 10000,
      interval: 500,
      stableCount: 6,
    });
    await Gestures.waitAndTap(elem, {
      elemDescription: `${tokenSymbol} token row`,
    });
  }
}

export default new TokensView();

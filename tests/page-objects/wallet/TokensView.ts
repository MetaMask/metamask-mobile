import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import NetworkManager from './NetworkManager';

class TokensView {
  get networkFilter(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  /**
   * The "Earn" CTA on the USDC token row's secondary balance area.
   * Index 2 = USDC (third token: ETH → mUSD → USDC) in the standard lending fixture.
   */
  get earnCta(): DetoxElement {
    return Matchers.getElementByID(SECONDARY_BALANCE_BUTTON_TEST_ID, 2);
  }

  async tapNetworkFilter(): Promise<void> {
    await Gestures.waitAndTap(this.networkFilter, {
      elemDescription: 'Token Network Filter',
    });
  }

  async tapAllPopularNetworks(): Promise<void> {
    await NetworkManager.tapSelectAllPopularNetworks();
    await NetworkManager.closeNetworkManager();
  }

  async tapEarnCta(): Promise<void> {
    await Gestures.waitAndTap(this.earnCta, {
      checkStability: true,
      elemDescription: 'Earn CTA on token row',
    });
  }

  async tapToken(tokenName: string): Promise<void> {
    const elem = Matchers.getElementByText(tokenName);
    await Utilities.waitForElementToStopMoving(elem, {
      timeout: 10000,
      interval: 500,
      stableCount: 6,
    });
    await Gestures.waitAndTap(elem, {
      elemDescription: `${tokenName} token`,
    });
  }
}

export default new TokensView();

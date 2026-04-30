import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import NetworkManager from './NetworkManager';

class TokensView {
  get networkFilter(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  earnCtaForToken(tokenSymbol: string): DetoxElement {
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

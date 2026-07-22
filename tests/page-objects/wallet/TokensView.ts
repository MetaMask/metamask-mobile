import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { SECONDARY_BALANCE_BUTTON_TEST_ID } from '../../../app/components/UI/AssetElement/index.constants';
import { getAssetTestId } from '../../selectors/Wallet/WalletView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import NetworkManager from './NetworkManager';
import {
  encapsulated,
  EncapsulatedElementType,
  PlatformDetector,
  encapsulatedAction,
} from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import Assertions from '../../framework/Assertions';

class TokensView {
  get networkFilter(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER);
  }

  earnCtaForToken(tokenSymbol: string): EncapsulatedElementType {
    const assetTestId = getAssetTestId(tokenSymbol);
    return encapsulated({
      detox: () =>
        Matchers.getElementIDWithAncestor(
          SECONDARY_BALANCE_BUTTON_TEST_ID,
          assetTestId,
        ),
      appium: {
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name='${assetTestId}']/descendant::*[@name='${SECONDARY_BALANCE_BUTTON_TEST_ID}']`,
          ),
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@resource-id='${assetTestId}' or contains(@resource-id,'${assetTestId}')]/descendant::*[@resource-id='${SECONDARY_BALANCE_BUTTON_TEST_ID}' or contains(@resource-id,'${SECONDARY_BALANCE_BUTTON_TEST_ID}')]`,
          ),
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
        const zeroBalance = element(
          by.text(`0 ${tokenSymbol}`).withAncestor(by.id(assetTestId)),
        );
        await waitFor(zeroBalance).not.toBeVisible().withTimeout(timeout);
      },
      appium: async () => {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(assetTestId),
          {
            timeout,
            description: `${tokenSymbol} token row`,
          },
        );

        const zeroBalanceText = `0 ${tokenSymbol}`;
        const zeroBalanceXPath = PlatformDetector.isIOS()
          ? `//*[@name='${assetTestId}']/descendant::*[@label='${zeroBalanceText}' or @name='${zeroBalanceText}' or @value='${zeroBalanceText}']`
          : `//*[@resource-id='${assetTestId}' or contains(@resource-id,'${assetTestId}')]/descendant::*[@text='${zeroBalanceText}']`;

        await Assertions.expectElementToNotBeVisible(
          encapsulated({
            appium: () =>
              PlaywrightMatchers.getElementByXPath(zeroBalanceXPath),
          }),
          {
            timeout,
            description: `${tokenSymbol} balance should be non-zero`,
          },
        );
      },
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

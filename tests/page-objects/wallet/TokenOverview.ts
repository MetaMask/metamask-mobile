import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  TokenOverviewSelectorsIDs,
  TokenOverviewSelectorsText,
} from '../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class TokenOverview {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            TokenOverviewSelectorsIDs.CONTAINER,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TokenOverviewSelectorsIDs.CONTAINER,
          ),
      },
    });
  }

  get tokenPrice(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.TOKEN_PRICE,
        ),
    });
  }

  get sendButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.SEND_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            TokenOverviewSelectorsIDs.SEND_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TokenOverviewSelectorsIDs.SEND_BUTTON,
          ),
      },
    });
  }

  /** Today's change display (e.g. "+2.5% Today") - used by performance tests */
  get todaysChange(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.TODAYS_CHANGE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.TODAYS_CHANGE,
        ),
    });
  }

  get priceChartDotEnd(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.PRICE_CHART_DOT_END),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.TOKEN_PRICE,
        ),
    });
  }

  get priceChartContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          TokenOverviewSelectorsIDs.PRICE_CHART_CONTAINER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.PRICE_CHART_CONTAINER,
        ),
    });
  }

  get unstakeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.UNSTAKE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.UNSTAKE_BUTTON,
        ),
    });
  }

  get stakeMoreButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletViewSelectorsIDs.STAKE_MORE_BUTTON,
        ),
    });
  }

  get stakedBalance(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsText.STAKED_BALANCE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsText.STAKED_BALANCE,
        ),
    });
  }

  get actionSheetSendButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
        ),
    });
  }

  get swapButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.SWAP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.SWAP_BUTTON,
        ),
    });
  }

  get bridgeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.BRIDGE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.BRIDGE_BUTTON,
        ),
    });
  }

  get claimButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.CLAIM_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.CLAIM_BUTTON,
        ),
    });
  }

  get receiveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.RECEIVE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.RECEIVE_BUTTON,
        ),
    });
  }

  get noChartData(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(TokenOverviewSelectorsText.NO_CHART_DATA),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          TokenOverviewSelectorsText.NO_CHART_DATA,
        ),
    });
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(CommonSelectorsIDs.BACK_ARROW_BUTTON),
    });
  }

  get unstakingBanner(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(TokenOverviewSelectorsIDs.UNSTAKING_BANNER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          TokenOverviewSelectorsIDs.UNSTAKING_BANNER,
        ),
    });
  }

  get chartPeriod1d(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['1d']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['1d']),
    });
  }

  get chartPeriod1w(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['1w']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['1w']),
    });
  }

  get chartPeriod1m(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['1m']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['1m']),
    });
  }

  get chartPeriod3m(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['3m']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['3m']),
    });
  }

  get chartPeriod1y(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['1y']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['1y']),
    });
  }

  get chartPeriod3y(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(TokenOverviewSelectorsText['3y']),
      appium: () =>
        PlaywrightMatchers.getElementByText(TokenOverviewSelectorsText['3y']),
    });
  }

  async tapSendButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sendButton, {
      description: 'Send Button',
    });
  }

  async tapActionSheetSendButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.actionSheetSendButton);
  }

  async tapBridgeButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.bridgeButton);
  }

  async tapSwapButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.swapButton);
  }

  async tapStakeMoreButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.stakeMoreButton);
  }

  async tapUnstakeButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.unstakeButton);
  }

  async tapBackButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton);
  }

  async tapClaimButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.claimButton);
  }

  async scrollOnScreen(): Promise<void> {
    await UnifiedGestures.swipe(this.tokenPrice, 'up', {
      elemDescription: 'Scroll on Token Overview Screen',
      percentage: 0.6,
      speed: 'fast',
    });
  }

  async tapChartPeriod1d(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod1d, {
      elemDescription: 'Chart Period 1d',
    });
  }

  async tapChartPeriod1w(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod1w, {
      elemDescription: 'Chart Period 1w',
    });
  }

  async tapChartPeriod1m(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod1m, {
      elemDescription: 'Chart Period 1m',
    });
  }

  async tapChartPeriod3m(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod3m, {
      elemDescription: 'Chart Period 3m',
    });
  }

  async tapChartPeriod1y(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod1y, {
      elemDescription: 'Chart Period 1y',
    });
  }

  async tapChartPeriod3y(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.chartPeriod3y, {
      elemDescription: 'Chart Period 3y',
    });
  }
}

export default new TokenOverview();

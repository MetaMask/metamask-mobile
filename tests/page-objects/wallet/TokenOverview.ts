import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  TokenOverviewSelectorsIDs,
  TokenOverviewSelectorsText,
} from '../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

class TokenOverview {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CONTAINER);
  }

  get tokenPrice(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get sendButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SEND_BUTTON);
  }

  /** Today's change display (e.g. "+2.5% Today") - used by performance tests */
  get todaysChange(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TODAYS_CHANGE);
  }

  get priceChartDotEnd(): EncapsulatedElementType {
    // Appium historically matched TOKEN_PRICE for this marker.
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get priceChartContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(
      TokenOverviewSelectorsIDs.PRICE_CHART_CONTAINER,
    );
  }

  get unstakeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.UNSTAKE_BUTTON);
  }

  get stakeMoreButton(): EncapsulatedElementType {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON);
  }

  get stakedBalance(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsText.STAKED_BALANCE);
  }

  get actionSheetSendButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get swapButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SWAP_BUTTON);
  }

  get bridgeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.BRIDGE_BUTTON);
  }

  get claimButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CLAIM_BUTTON);
  }

  get receiveButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.RECEIVE_BUTTON);
  }

  get noChartData(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText.NO_CHART_DATA);
  }

  get closeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get unstakingBanner(): EncapsulatedElementType {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.UNSTAKING_BANNER);
  }

  get chartPeriod1d(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1d']);
  }

  get chartPeriod1w(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1w']);
  }

  get chartPeriod1m(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1m']);
  }

  get chartPeriod3m(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3m']);
  }

  get chartPeriod1y(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1y']);
  }

  get chartPeriod3y(): EncapsulatedElementType {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3y']);
  }

  async tapSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendButton, {
      elemDescription: 'Send Button',
    });
  }

  async tapActionSheetSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.actionSheetSendButton, {
      elemDescription: 'Action sheet send button',
    });
  }

  async tapBridgeButton(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeButton, {
      elemDescription: 'Bridge button',
    });
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton, {
      elemDescription: 'Swap button',
    });
  }

  async tapStakeMoreButton(): Promise<void> {
    await Gestures.waitAndTap(this.stakeMoreButton, {
      elemDescription: 'Stake more button',
    });
  }

  async tapUnstakeButton(): Promise<void> {
    await Gestures.waitAndTap(this.unstakeButton, {
      elemDescription: 'Unstake button',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Token overview back button',
    });
  }

  async tapClaimButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton, {
      elemDescription: 'Claim button',
    });
  }

  async scrollOnScreen(): Promise<void> {
    await Gestures.swipe(this.tokenPrice, 'up', {
      elemDescription: 'Scroll on Token Overview Screen',
      percentage: 0.6,
      speed: 'fast',
    });
  }

  async tapChartPeriod1d(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod1d, {
      elemDescription: 'Chart Period 1d',
    });
  }

  async tapChartPeriod1w(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod1w, {
      elemDescription: 'Chart Period 1w',
    });
  }

  async tapChartPeriod1m(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod1m, {
      elemDescription: 'Chart Period 1m',
    });
  }

  async tapChartPeriod3m(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod3m, {
      elemDescription: 'Chart Period 3m',
    });
  }

  async tapChartPeriod1y(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod1y, {
      elemDescription: 'Chart Period 1y',
    });
  }

  async tapChartPeriod3y(): Promise<void> {
    await Gestures.waitAndTap(this.chartPeriod3y, {
      elemDescription: 'Chart Period 3y',
    });
  }
}

export default new TokenOverview();

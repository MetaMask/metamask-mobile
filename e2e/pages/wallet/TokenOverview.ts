import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';
import {
  TokenOverviewSelectorsIDs,
  TokenOverviewSelectorsText,
} from '../../selectors/wallet/TokenOverview.selectors';
import { WalletActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/WalletActionsBottomSheet.selectors';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class TokenOverview {
  get container(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get tokenPrice(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get sendButton(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SEND_BUTTON);
  }

  get unstakeButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.UNSTAKE_BUTTON);
  }

  get depositButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.DEPOSIT_BUTTON);
  }

  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.WITHDRAW_BUTTON);
  }

  get stakeMoreButton(): DetoxElement {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON);
  }

  get stakedBalance(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsText.STAKED_BALANCE);
  }

  get actionSheetSendButton(): DetoxElement {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get swapButton(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SWAP_BUTTON);
  }

  get bridgeButton(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.BRIDGE_BUTTON);
  }

  get claimButton(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CLAIM_BUTTON);
  }

  get receiveButton(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.RECEIVE_BUTTON);
  }

  get noChartData(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText.NO_CHART_DATA);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get unstakingBanner(): DetoxElement {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.UNSTAKING_BANNER);
  }

  get chartPeriod1d(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1d']);
  }

  get chartPeriod1w(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1w']);
  }

  get chartPeriod1m(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1m']);
  }

  get chartPeriod3m(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3m']);
  }

  get chartPeriod1y(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1y']);
  }

  get chartPeriod3y(): DetoxElement {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3y']);
  }

  async tapSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapActionSheetSendButton(): Promise<void> {
    await Gestures.waitAndTap(this.actionSheetSendButton);
  }

  async tapBridgeButton(): Promise<void> {
    await Gestures.waitAndTap(this.bridgeButton);
  }

  async tapSwapButton(): Promise<void> {
    await Gestures.waitAndTap(this.swapButton);
  }

  async tapWithdrawButton(): Promise<void> {
    await Utilities.waitForElementToStopMoving(this.withdrawButton);
    await Gestures.waitAndTap(this.withdrawButton);
  }

  async tapDepositButton(): Promise<void> {
    await Utilities.waitForElementToStopMoving(this.depositButton);
    await Gestures.waitAndTap(this.depositButton);
  }

  async tapStakeMoreButton(): Promise<void> {
    await Gestures.waitAndTap(this.stakeMoreButton);
  }

  async tapUnstakeButton(): Promise<void> {
    await Gestures.waitAndTap(this.unstakeButton);
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton);
  }

  async tapClaimButton(): Promise<void> {
    await Gestures.waitAndTap(this.claimButton);
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

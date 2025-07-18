import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  TokenOverviewSelectorsIDs,
  TokenOverviewSelectorsText,
} from '../../selectors/wallet/TokenOverview.selectors';
import { WalletActionsBottomSheetSelectorsIDs } from '../../selectors/wallet/WalletActionsBottomSheet.selectors.js';
import { WalletViewSelectorsIDs } from '../../selectors/wallet/WalletView.selectors';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class TokenOverview {
  get container() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get tokenPrice() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get sendButton() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SEND_BUTTON);
  }

  get unstakeButton() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.UNSTAKE_BUTTON);
  }

  get stakeMoreButton() {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON);
  }

  get stakedBalance() {
    return Matchers.getElementByID(TokenOverviewSelectorsText.STAKED_BALANCE);
  }

  get actionSheetSendButton() {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get swapButton() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SWAP_BUTTON);
  }

  get bridgeButton() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.BRIDGE_BUTTON);
  }

  get claimButton() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CLAIM_BUTTON);
  }

  get receiveButton() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.RECEIVE_BUTTON);
  }

  get noChartData() {
    return Matchers.getElementByText(TokenOverviewSelectorsText.NO_CHART_DATA);
  }

  get closeButton() {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get unstakingBanner() {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.UNSTAKING_BANNER);
  }

  get chartPeriod1d() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1d']);
  }

  get chartPeriod1w() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1w']);
  }

  get chartPeriod1m() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1m']);
  }

  get chartPeriod3m() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3m']);
  }

  get chartPeriod1y() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1y']);
  }

  get chartPeriod3y() {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3y']);
  }

  async tapSendButton() {
    await Gestures.waitAndTap(this.sendButton);
  }

  async tapActionSheetSendButton() {
    await Gestures.waitAndTap(this.actionSheetSendButton);
  }

  async tapBridgeButton() {
    await Gestures.waitAndTap(this.bridgeButton);
  }

  async tapSwapButton() {
    await Gestures.waitAndTap(this.swapButton);
  }

  async tapStakeMoreButton() {
    await Gestures.waitAndTap(this.stakeMoreButton);
  }

  async tapUnstakeButton() {
    await Gestures.waitAndTap(this.unstakeButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.closeButton);
  }

  async tapClaimButton() {
    await Gestures.waitAndTap(this.claimButton);
  }

  async scrollOnScreen() {
    await Gestures.swipe(this.tokenPrice, 'up', 'fast', 0.6);
  }

  async tapChartPeriod1d() {
    await Gestures.waitAndTap(this.chartPeriod1d);
  }

  async tapChartPeriod1w() {
    await Gestures.waitAndTap(this.chartPeriod1w);
  }

  async tapChartPeriod1m() {
    await Gestures.waitAndTap(this.chartPeriod1m);
  }

  async tapChartPeriod3m() {
    await Gestures.waitAndTap(this.chartPeriod3m);
  }

  async tapChartPeriod1y() {
    await Gestures.waitAndTap(this.chartPeriod1y);
  }

  async tapChartPeriod3y() {
    await Gestures.waitAndTap(this.chartPeriod3y);
  }
}

export default new TokenOverview();

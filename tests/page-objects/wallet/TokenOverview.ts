import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  TokenOverviewSelectorsIDs,
  TokenOverviewSelectorsText,
} from '../../../app/components/UI/AssetOverview/TokenOverview.testIds';
import { WalletActionsBottomSheetSelectorsIDs } from '../../../app/components/Views/WalletActions/WalletActionsBottomSheet.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import type { AppiumElement } from '../../framework/AppiumElement';

class TokenOverview {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CONTAINER);
  }

  get tokenPrice(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get sendButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SEND_BUTTON);
  }

  /** Today's change display (e.g. "+2.5% Today") - used by performance tests */
  get todaysChange(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TODAYS_CHANGE);
  }

  get priceChartDotEnd(): Promise<AppiumElement> {
    // Appium historically matched TOKEN_PRICE for this marker.
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.TOKEN_PRICE);
  }

  get priceChartContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      TokenOverviewSelectorsIDs.PRICE_CHART_CONTAINER,
    );
  }

  get unstakeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.UNSTAKE_BUTTON);
  }

  get stakeMoreButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(WalletViewSelectorsIDs.STAKE_MORE_BUTTON);
  }

  get stakedBalance(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsText.STAKED_BALANCE);
  }

  get actionSheetSendButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      WalletActionsBottomSheetSelectorsIDs.SEND_BUTTON,
    );
  }

  get swapButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.SWAP_BUTTON);
  }

  get bridgeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.BRIDGE_BUTTON);
  }

  get claimButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.CLAIM_BUTTON);
  }

  get receiveButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.RECEIVE_BUTTON);
  }

  get noChartData(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText.NO_CHART_DATA);
  }

  get closeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get unstakingBanner(): Promise<AppiumElement> {
    return Matchers.getElementByID(TokenOverviewSelectorsIDs.UNSTAKING_BANNER);
  }

  get chartPeriod1d(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1d']);
  }

  get chartPeriod1w(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1w']);
  }

  get chartPeriod1m(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1m']);
  }

  get chartPeriod3m(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText['3m']);
  }

  get chartPeriod1y(): Promise<AppiumElement> {
    return Matchers.getElementByText(TokenOverviewSelectorsText['1y']);
  }

  get chartPeriod3y(): Promise<AppiumElement> {
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

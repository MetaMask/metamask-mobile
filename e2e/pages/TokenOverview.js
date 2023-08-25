import TestHelpers from '../helpers';
import {
  TOKEN_ASSET_OVERVIEW,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
  ASSET_BACK_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';

const chartTimePeriod = ["1D", "1W", "1M", "3M", "1Y", "3Y"]
const NO_CHART_DATA = 'No chart data'

export default class TokenOverview {
  static async tapSendButton() {
    await TestHelpers.waitAndTap(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  static async tapSwapButton() {
    await TestHelpers.tap(TOKEN_OVERVIEW_SWAP_BUTTON);
  }

  static async scrollOnScreen() {
    await TestHelpers.swipe('txn-screen', 'up', 'slow', 0.3); // this testID could be renamed.
  }

  static async tapBackButton() {
    await TestHelpers.tap(ASSET_BACK_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TOKEN_ASSET_OVERVIEW);
  }

  static async selectChart(chartPeriod) {
    await TestHelpers.tapByText(chartPeriod);
  }

  static async checkIfChartIsVisible() {
    for (period of chartTimePeriod) {
      await this.selectChart(period)
      await TestHelpers.checkIfElementWithTextIsNotVisible(NO_CHART_DATA);
    }
  }

  static async checkChartNotVisible() {
      await TestHelpers.checkIfElementWithTextIsVisible(NO_CHART_DATA);
  }
  static async checkIfReceiveButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_RECEIVE_BUTTON)
  }

  static async checkIfSendButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_SEND_BUTTON)
  }

  static async checkIfBuyButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_BUY_BUTTON)
  }

  static async checkIfSwapButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_SWAP_BUTTON)
  }


}

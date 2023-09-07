import TestHelpers from '../helpers';
import {
  TOKEN_PRICE,
  TOKEN_ASSET_OVERVIEW,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
  TOKEN_OVERVIEW_TXN_SCREEN,
  ASSET_BACK_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import messages from '../../locales/languages/en.json';

const chartTimePeriod = [
  messages.asset_overview.chart_time_period_navigation['1d'],
  messages.asset_overview.chart_time_period_navigation['1w'],
  messages.asset_overview.chart_time_period_navigation['1m'],
  messages.asset_overview.chart_time_period_navigation['3m'],
  messages.asset_overview.chart_time_period_navigation['1y'],
  messages.asset_overview.chart_time_period_navigation['3y'],
];

export default class TokenOverview {
  static async tapSendButton() {
    await TestHelpers.waitAndTap(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  static async tapSwapButton() {
    await TestHelpers.tap(TOKEN_OVERVIEW_SWAP_BUTTON);
  }

  static async scrollOnScreen() {
    await TestHelpers.swipe(TOKEN_OVERVIEW_TXN_SCREEN, 'up', 'slow', 0.3);
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
    for (const period of chartTimePeriod) {
      await this.selectChart(period);
      await TestHelpers.checkIfElementWithTextIsNotVisible(
        messages.asset_overview.no_chart_data.title,
      );
    }
  }

  static async checkTokenQuoteIsNotZero() {
    await TestHelpers.checkIfElementNotToHaveText(TOKEN_PRICE, '$0');
  }

  static async checkChartNotVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      messages.asset_overview.no_chart_data.title,
    );
  }
  static async isReceiveButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_RECEIVE_BUTTON);
  }

  static async isSendButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  static async isBuyButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_BUY_BUTTON);
  }

  static async isSwapButtonVisible() {
    await TestHelpers.checkIfExists(TOKEN_OVERVIEW_SWAP_BUTTON);
  }
}

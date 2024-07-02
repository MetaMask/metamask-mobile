import TestHelpers from '../helpers';
import {
  TOKEN_PRICE,
  TOKEN_ASSET_OVERVIEW,
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_OVERVIEW_RECEIVE_BUTTON,
  TOKEN_OVERVIEW_BUY_BUTTON,
  TOKEN_OVERVIEW_SWAP_BUTTON,
  ASSET_BACK_BUTTON,
} from '../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';
import enContent from '../../locales/languages/en.json';

const chartTimePeriod = [
  enContent.asset_overview.chart_time_period_navigation['1d'],
  enContent.asset_overview.chart_time_period_navigation['1w'],
  enContent.asset_overview.chart_time_period_navigation['1m'],
  enContent.asset_overview.chart_time_period_navigation['3m'],
  enContent.asset_overview.chart_time_period_navigation['1y'],
  enContent.asset_overview.chart_time_period_navigation['3y'],
];

export default class TokenOverview {
  static async tapSendButton() {
    await this.scrollOnScreen();
    await TestHelpers.waitAndTap(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  static async tapSwapButton() {
    await TestHelpers.waitAndTap(TOKEN_OVERVIEW_SWAP_BUTTON);
  }

  static async scrollOnScreen() {
    await TestHelpers.swipe(TOKEN_PRICE, 'up', 'fast', 0.6);
  }

  static async tapBackButton() {
    await TestHelpers.waitAndTap(ASSET_BACK_BUTTON);
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
        enContent.asset_overview.no_chart_data.title,
      );
    }
  }

  static async TokenQuoteIsNotZero() {
    await TestHelpers.checkIfElementNotToHaveText(TOKEN_PRICE, '$0');
  }

  static async TokenQuoteIsZero() {
    await TestHelpers.checkIfHasText(TOKEN_PRICE, '$0');
  }

  static async ChartNotVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      enContent.asset_overview.no_chart_data.title,
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

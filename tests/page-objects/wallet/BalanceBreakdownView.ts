import { BalanceBreakdownTestIds } from '../../../app/components/Views/BalanceBreakdown/BalanceBreakdown.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';

class BalanceBreakdownView {
  get container() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.CONTAINER);
  }

  get donutChart() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.DONUT_CHART);
  }

  get heroTotal() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.HERO_TOTAL);
  }

  legendRow(key: string) {
    return Matchers.getElementByID(BalanceBreakdownTestIds.LEGEND_ROW(key));
  }

  drilldownList() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.DRILLDOWN_LIST);
  }

  actionButton() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.ACTION_BUTTON);
  }

  warningBanner() {
    return Matchers.getElementByID(BalanceBreakdownTestIds.WARNING_BANNER);
  }

  async tapTokensLegendRow() {
    await Gestures.tap(this.legendRow('tokens'), {
      elemDescription: 'Tap Tokens legend row',
    });
  }

  async tapPerpsLegendRow() {
    await Gestures.tap(this.legendRow('perps'), {
      elemDescription: 'Tap Perps legend row',
    });
  }

  async tapPredictLegendRow() {
    await Gestures.tap(this.legendRow('predict'), {
      elemDescription: 'Tap Predict legend row',
    });
  }

  async tapDefiLegendRow() {
    await Gestures.tap(this.legendRow('defi'), {
      elemDescription: 'Tap DeFi legend row',
    });
  }

  async verifyContainerVisible() {
    await Assertions.expectElementToBeVisible(this.container, {
      description: 'Balance breakdown container should be visible',
    });
  }

  async verifyDonutChartVisible() {
    await Assertions.expectElementToBeVisible(this.donutChart, {
      description: 'Donut chart should be visible',
    });
  }

  async verifyHeroTotalVisible() {
    await Assertions.expectElementToBeVisible(this.heroTotal, {
      description: 'Hero total balance should be visible',
    });
  }

  async verifyDrilldownVisible() {
    await Assertions.expectElementToBeVisible(this.drilldownList(), {
      description: 'Drilldown list should be visible after tapping a segment',
    });
  }

  async verifyDrilldownNotVisible() {
    await Assertions.expectElementToNotBeVisible(this.drilldownList(), {
      description: 'Drilldown list should not be visible in overview mode',
    });
  }

  async verifyActionButtonVisible() {
    await Assertions.expectElementToBeVisible(this.actionButton(), {
      description: 'Action footer CTA should be visible',
    });
  }
}

export default new BalanceBreakdownView();

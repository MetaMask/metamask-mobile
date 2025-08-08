import PerpsView from '../../../pages/Perps/PerpsView';
import PerpsMarketDetailsView from '../../../pages/Perps/PerpsMarketDetailsView';
import PerpsMarketListView from '../../../pages/Perps/PerpsMarketListView';
import PerpsOrderView from '../../../pages/Perps/PerpsOrderView';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';

/**
 * Helper functions for common Perps e2e test operations
 */
export class PerpsHelpers {
  /**
   * Navigate to Perps market list from the main positions view
   */
  static async navigateToMarketList(): Promise<void> {
    await Assertions.expectElementToBeVisible(PerpsView.noPositionsContainer);
    await PerpsView.tapStartTradingButton();
    await Assertions.expectElementToBeVisible(PerpsMarketListView.container);
  }

  /**
   * Navigate to a specific market details view
   * @param marketName - The name of the market to select (e.g., 'ETH/USD')
   */
  static async navigateToMarketDetails(marketName: string): Promise<void> {
    await this.navigateToMarketList();
    await PerpsMarketListView.selectMarket(marketName);
    await PerpsMarketDetailsView.waitForMarketDetailsToLoad();
    await Assertions.expectElementToBeVisible(PerpsMarketDetailsView.container);
  }

  /**
   * Initiate a long position flow for a specific market
   * @param marketName - The name of the market (e.g., 'ETH/USD')
   */
  static async initiateLongPosition(marketName: string): Promise<void> {
    await this.navigateToMarketDetails(marketName);
    await PerpsMarketDetailsView.tapLongButton();
    await PerpsOrderView.waitForOrderViewToLoad();
    await Assertions.expectElementToBeVisible(PerpsOrderView.orderHeader);
  }

  /**
   * Initiate a short position flow for a specific market
   * @param marketName - The name of the market (e.g., 'ETH/USD')
   */
  static async initiateShortPosition(marketName: string): Promise<void> {
    await this.navigateToMarketDetails(marketName);
    await PerpsMarketDetailsView.tapShortButton();
    await PerpsOrderView.waitForOrderViewToLoad();
    await Assertions.expectElementToBeVisible(PerpsOrderView.orderHeader);
  }

  /**
   * Verify all market statistics are displayed in market details
   */
  static async verifyMarketStatistics(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.statisticsHigh24h,
    );
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.statisticsLow24h,
    );
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.statisticsVolume24h,
    );
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.statisticsOpenInterest,
    );
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.statisticsFundingRate,
    );
  }

  /**
   * Verify chart components are properly loaded
   */
  static async verifyChartComponents(): Promise<void> {
    await PerpsMarketDetailsView.waitForChartToLoad();
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.candlestickChart,
    );
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.chartCandles,
    );
  }

  /**
   * Test info tooltip functionality for a specific info icon
   * @param tapAction - Function to tap the info icon
   * @param tooltipDescription - Description of the tooltip for logging
   */
  static async testInfoTooltip(
    tapAction: () => Promise<void>,
    tooltipDescription: string,
  ): Promise<void> {
    await tapAction();
    await Assertions.expectElementToBeVisible(
      PerpsMarketDetailsView.bottomSheetTooltip,
    );
    console.log(`${tooltipDescription} tooltip displayed successfully`);
    await TestHelpers.delay(1000); // Allow time for tooltip to be visible
  }

  /**
   * Test all order view info tooltips
   */
  static async testOrderViewTooltips(): Promise<void> {
    const tooltipTests = [
      {
        action: () => PerpsOrderView.tapLeverageInfoIcon(),
        description: 'Leverage',
      },
      {
        action: () => PerpsOrderView.tapMarginInfoIcon(),
        description: 'Margin',
      },
      {
        action: () => PerpsOrderView.tapLiquidationPriceInfoIcon(),
        description: 'Liquidation Price',
      },
      {
        action: () => PerpsOrderView.tapFeesInfoIcon(),
        description: 'Fees',
      },
    ];

    for (const test of tooltipTests) {
      await test.action();
      await Assertions.expectElementToBeVisible(
        PerpsOrderView.bottomSheetTooltip,
      );
      await Assertions.expectElementToBeVisible(
        PerpsOrderView.tooltipGotItButton,
      );
      await PerpsOrderView.tapTooltipGotItButton();
      console.log(`${test.description} tooltip test completed`);
      await TestHelpers.delay(500);
    }
  }

  /**
   * Verify position card elements when positions exist
   */
  static async verifyPositionCard(): Promise<void> {
    await Assertions.expectElementToBeVisible(PerpsView.positionCard);
    await Assertions.expectElementToBeVisible(PerpsView.positionCardCoin);
    await Assertions.expectElementToBeVisible(PerpsView.positionCardSize);
    await Assertions.expectElementToBeVisible(PerpsView.positionCardPnL);
    await Assertions.expectElementToBeVisible(
      PerpsView.positionCardCloseButton,
    );
    await Assertions.expectElementToBeVisible(PerpsView.positionCardEditButton);
  }

  /**
   * Navigate through the complete market selection flow
   * @param marketName - The market to select
   * @returns Promise that resolves when in market details view
   */
  static async completeMarketSelectionFlow(marketName: string): Promise<void> {
    // Start from positions view
    await Assertions.expectElementToBeVisible(PerpsView.container);

    // Navigate to market list
    await this.navigateToMarketList();

    // Select market
    await PerpsMarketListView.selectMarket(marketName);

    // Wait for market details to load
    await PerpsMarketDetailsView.waitForMarketDetailsToLoad();

    // Verify we're in market details
    await Assertions.expectElementToBeVisible(PerpsMarketDetailsView.container);
    await Assertions.expectElementToBeVisible(PerpsMarketDetailsView.assetName);

    console.log(`Successfully navigated to ${marketName} market details`);
  }

  /**
   * Wait for Perps components to load with timeout
   * @param timeout - Timeout in milliseconds (default: 10000)
   */
  static async waitForPerpsToLoad(timeout: number = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await Assertions.expectElementToBeVisible(PerpsView.container);
        return;
      } catch (error) {
        await TestHelpers.delay(1000);
      }
    }

    throw new Error(`Perps failed to load within ${timeout}ms`);
  }

  /**
   * Common setup for Perps tests
   */
  static async setupPerpsTest(): Promise<void> {
    await TestHelpers.delay(3000); // Wait for app to initialize
    await this.waitForPerpsToLoad();
    console.log('Perps test setup completed');
  }
}

/**
 * Common market names for testing
 */
export const PERPS_MARKETS = {
  ETH_USD: 'ETH/USD',
  BTC_USD: 'BTC/USD',
  SOL_USD: 'SOL/USD',
  MATIC_USD: 'MATIC/USD',
} as const;

/**
 * Common test data and constants
 */
export const PERPS_TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 10000,
  CHART_LOAD_TIMEOUT: 5000,
  POSITION_LOAD_TIMEOUT: 3000,
  TOOLTIP_DISPLAY_DURATION: 1000,
} as const;

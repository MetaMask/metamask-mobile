import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { PriceChartProvider } from '../../../../UI/AssetOverview/PriceChart/PriceChart.context';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';
import TraderPriceChart from './TraderPriceChart';

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'asset_overview.no_chart_data.title': 'No chart data',
      'asset_overview.no_chart_data.description':
        'We could not fetch any data for this token',
      'asset_overview.no_chart_data.insufficient_data':
        'Data is not available for this time period',
    };
    return translations[key] || key;
  },
}));

const BASE_TS = 1_700_000_000_000;
const INTERVAL = 60_000;

/** Build N price points spaced 1 minute apart, starting from BASE_TS. */
const makePrices = (n: number): TokenPrice[] =>
  Array.from({ length: n }, (_, i) => [
    String(BASE_TS + i * INTERVAL),
    100 + i,
  ]) as TokenPrice[];

const makeTrade = (overrides: Partial<Trade> = {}): Trade => ({
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 1,
  usdCost: 100,
  timestamp: BASE_TS + 2 * INTERVAL,
  transactionHash: '0xabc123',
  ...overrides,
});

const defaultProps = {
  prices: [] as TokenPrice[],
  priceDiff: 0,
  isLoading: false,
  onChartIndexChange: jest.fn(),
};

/**
 * Simulate the AreaChart `onLayout` event so SVG children (decorators) render.
 * react-native-svg-charts only calls its render prop children after it receives
 * a non-zero layout from the host View.
 */
function triggerChartLayout(
  getByTestId: ReturnType<typeof render>['getByTestId'],
) {
  const chartArea = getByTestId('price-chart-area');
  chartArea
    .findAll((node) => typeof node.props?.onLayout === 'function')
    .forEach((v) =>
      fireEvent(v, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 200 } },
      }),
    );
}

describe('TraderPriceChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(createMockUseAnalyticsHook());
  });

  // ── Inherited PriceChart behaviour ─────────────────────────────────────────

  describe('no-data / loading overlays', () => {
    it('shows no-data overlay when prices is empty', () => {
      const { getByText } = render(<TraderPriceChart {...defaultProps} />);
      expect(getByText('No chart data')).toBeOnTheScreen();
    });

    it('shows loading skeleton when isLoading is true', () => {
      const { getByTestId } = render(
        <TraderPriceChart {...defaultProps} isLoading />,
      );
      expect(getByTestId('price-chart-loading')).toBeOnTheScreen();
    });

    it('renders the chart area when prices has enough points', () => {
      const { getByTestId } = render(
        <TraderPriceChart {...defaultProps} prices={makePrices(5)} />,
      );
      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });
  });

  describe('end dot', () => {
    it('renders the end dot when there are no trade markers', () => {
      const result = render(
        <TraderPriceChart
          {...defaultProps}
          prices={makePrices(5)}
          priceDiff={5}
        />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.getByTestId('price-chart-end-dot')).toBeOnTheScreen();
    });

    it('renders the end dot when the closest trade marker is more than 2 indices away', () => {
      const prices = makePrices(10);
      // Trade at index 5 — last index is 9, distance = 4 > 2, so end-dot should show.
      const trade = makeTrade({
        timestamp: BASE_TS + 5 * INTERVAL,
        transactionHash: '0xfar',
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.getByTestId('price-chart-end-dot')).toBeOnTheScreen();
    });

    it('suppresses the end dot when a trade marker maps to the last index', () => {
      const prices = makePrices(10);
      // Trade at the last price point (index 9).
      const trade = makeTrade({
        timestamp: BASE_TS + 9 * INTERVAL,
        transactionHash: '0xlast',
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.queryByTestId('price-chart-end-dot')).toBeNull();
      // The trade marker itself should still be visible.
      expect(result.getByTestId('trade-marker-0xlast')).toBeOnTheScreen();
    });

    it('suppresses the end dot when a trade marker is within 2 indices of the end', () => {
      const prices = makePrices(10);
      // Trade at index 8 — last is 9, distance = 1 ≤ 2.
      const trade = makeTrade({
        timestamp: BASE_TS + 8 * INTERVAL,
        transactionHash: '0xnear',
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.queryByTestId('price-chart-end-dot')).toBeNull();
    });
  });

  // ── Trade markers ─────────────────────────────────────────────────────────

  describe('trade markers', () => {
    it('renders no markers when trades prop is not supplied', () => {
      const result = render(
        <TraderPriceChart {...defaultProps} prices={makePrices(5)} />,
      );
      triggerChartLayout(result.getByTestId);
      // There should be no trade-marker testIDs in the tree.
      expect(result.queryByTestId('trade-marker-0xabc123')).toBeNull();
    });

    it('renders no markers when trades is an empty array', () => {
      const result = render(
        <TraderPriceChart
          {...defaultProps}
          prices={makePrices(5)}
          trades={[]}
        />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.queryByTestId('trade-marker-0xabc123')).toBeNull();
    });

    it('renders a buy marker for an enter trade within the price window', () => {
      const prices = makePrices(10);
      const trade = makeTrade({
        intent: 'enter',
        transactionHash: '0xbuy001',
        timestamp: BASE_TS + 3 * INTERVAL,
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.getByTestId('trade-marker-0xbuy001')).toBeOnTheScreen();
    });

    it('renders a sell marker for an exit trade within the price window', () => {
      const prices = makePrices(10);
      const trade = makeTrade({
        intent: 'exit',
        direction: 'sell',
        transactionHash: '0xsell001',
        timestamp: BASE_TS + 5 * INTERVAL,
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.getByTestId('trade-marker-0xsell001')).toBeOnTheScreen();
    });

    it('renders markers for both buy and sell trades simultaneously', () => {
      const prices = makePrices(10);
      const trades: Trade[] = [
        makeTrade({
          intent: 'enter',
          transactionHash: '0xbuy002',
          timestamp: BASE_TS + 2 * INTERVAL,
        }),
        makeTrade({
          intent: 'exit',
          direction: 'sell',
          transactionHash: '0xsell002',
          timestamp: BASE_TS + 7 * INTERVAL,
        }),
      ];
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={trades} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.getByTestId('trade-marker-0xbuy002')).toBeOnTheScreen();
      expect(result.getByTestId('trade-marker-0xsell002')).toBeOnTheScreen();
    });

    it('does not render a marker for a trade outside the price window', () => {
      const prices = makePrices(5);
      const trade = makeTrade({
        transactionHash: '0xoutside',
        timestamp: BASE_TS - 10 * INTERVAL, // before window
      });
      const result = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.queryByTestId('trade-marker-0xoutside')).toBeNull();
    });

    it('does not render markers when the chart has insufficient data (< 5 points)', () => {
      const prices = makePrices(3);
      const trade = makeTrade({
        transactionHash: '0xnoshow',
        timestamp: BASE_TS + 1 * INTERVAL,
      });
      const { queryByTestId } = render(
        <TraderPriceChart {...defaultProps} prices={prices} trades={[trade]} />,
      );
      // No chart area rendered, so no markers either.
      expect(queryByTestId('price-chart-area')).toBeNull();
      expect(queryByTestId('trade-marker-0xnoshow')).toBeNull();
    });

    it('hides markers while isLoading is true', () => {
      const prices = makePrices(10);
      const trade = makeTrade({ transactionHash: '0xloading' });
      const result = render(
        <TraderPriceChart
          {...defaultProps}
          prices={prices}
          isLoading
          trades={[trade]}
        />,
      );
      triggerChartLayout(result.getByTestId);
      expect(result.queryByTestId('trade-marker-0xloading')).toBeNull();
    });
  });

  // ── PriceChartProvider integration ────────────────────────────────────────

  describe('PriceChartProvider integration', () => {
    it('renders correctly inside a PriceChartProvider', () => {
      const { getByTestId } = render(
        <PriceChartProvider>
          <TraderPriceChart
            {...defaultProps}
            prices={makePrices(5)}
            trades={[makeTrade()]}
          />
        </PriceChartProvider>,
      );
      expect(getByTestId('price-chart-area')).toBeOnTheScreen();
    });
  });
});

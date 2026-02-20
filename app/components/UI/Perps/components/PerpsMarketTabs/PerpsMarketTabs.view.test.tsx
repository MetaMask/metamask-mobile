/**
 * Component view tests for PerpsMarketTabs.
 * Covers: PerpsMarketTabs + PerpsPositionCard (position tab) + PerpsOpenOrderCard (orders tab)
 * + PerpsMarketStatisticsCard (statistics tab) + tab switching.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsMarketTabs.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import {
  renderPerpsComponent,
  defaultPositionForViews,
  defaultOrderForViews,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsMarketTabs from './PerpsMarketTabs';
import { PerpsMarketTabsSelectorsIDs } from '../../Perps.testIds';

const renderMarketTabs = (
  props: Partial<Parameters<typeof PerpsMarketTabs>[0]> = {},
  streamOverrides: Record<string, unknown[]> = {},
) =>
  renderPerpsComponent(
    PerpsMarketTabs as unknown as React.ComponentType<Record<string, unknown>>,
    { symbol: 'ETH', ...props },
    { streamOverrides },
  );

describe('PerpsMarketTabs', () => {
  describe('tab navigation', () => {
    it('renders tab container with position, orders, and statistics tabs', async () => {
      renderMarketTabs({}, { positions: [defaultPositionForViews] });

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('switches to orders tab and shows empty state when no orders', async () => {
      renderMarketTabs(
        {},
        { positions: [defaultPositionForViews], orders: [] },
      );

      const ordersTab = await screen.findByTestId(
        PerpsMarketTabsSelectorsIDs.ORDERS_TAB,
      );
      fireEvent.press(ordersTab);

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.ORDERS_EMPTY_STATE,
        ),
      ).toBeOnTheScreen();
    });

    it('switches to statistics tab', async () => {
      renderMarketTabs({}, { positions: [] });

      const statisticsTab = await screen.findByTestId(
        PerpsMarketTabsSelectorsIDs.STATISTICS_TAB,
      );
      fireEvent.press(statisticsTab);

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('position tab with position data', () => {
    it('renders position card when a matching position exists in stream', async () => {
      renderMarketTabs({}, { positions: [defaultPositionForViews] });

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_TAB),
      ).toBeOnTheScreen();
    });
  });

  describe('orders tab with order data', () => {
    it('renders order card when orders exist for the symbol', async () => {
      renderMarketTabs(
        {},
        {
          positions: [],
          orders: [defaultOrderForViews],
        },
      );

      const ordersTab = await screen.findByTestId(
        PerpsMarketTabsSelectorsIDs.ORDERS_TAB,
      );
      fireEvent.press(ordersTab);

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
      ).toBeOnTheScreen();
    });
  });

  describe('statistics-only view (no position)', () => {
    it('shows statistics when no position exists for the symbol', async () => {
      renderMarketTabs({ symbol: 'SOL' }, { positions: [] });

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT,
        ),
      ).toBeOnTheScreen();
    });
  });
});

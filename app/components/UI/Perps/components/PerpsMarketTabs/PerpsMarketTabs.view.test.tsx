/**
 * Component view tests for PerpsMarketTabs.
 * Covers: PerpsMarketTabs + PerpsPositionCard (position tab) + PerpsOpenOrderCard (orders tab)
 * + PerpsMarketStatisticsCard (statistics tab) + tab switching.
 * State-driven via Redux and stream overrides; no hook mocks.
 * Run with: yarn test:view --testPathPattern="PerpsMarketTabs.view.test"
 */
import '../../../../../../tests/component-view/mocks';
import { screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
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
      renderMarketTabs(
        {},
        {
          positions: [defaultPositionForViews],
          orders: [defaultOrderForViews],
        },
      );

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.queryAllByText(strings('perps.market.position')).length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByText(strings('perps.market.orders')).length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryAllByText(strings('perps.market.statistics')).length,
      ).toBeGreaterThan(0);
    });

    it('hides orders tab when no orders exist', async () => {
      renderMarketTabs(
        {},
        { positions: [defaultPositionForViews], orders: [] },
      );

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.queryAllByText(strings('perps.market.orders')),
      ).toHaveLength(0);
      expect(
        screen.getByTestId(PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT),
      ).toBeOnTheScreen();
    });

    it('renders statistics content when statistics is initial tab', async () => {
      renderMarketTabs(
        { initialTab: 'statistics' },
        {
          positions: [defaultPositionForViews],
          orders: [defaultOrderForViews],
        },
      );

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('position tab with position data', () => {
    it('renders position card when a matching position exists in stream', async () => {
      renderMarketTabs(
        { initialTab: 'position' },
        { positions: [defaultPositionForViews] },
      );

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeOnTheScreen();
    });
  });

  describe('orders tab with order data', () => {
    it('renders order card when orders exist for the symbol', async () => {
      renderMarketTabs(
        { initialTab: 'orders' },
        {
          positions: [],
          orders: [defaultOrderForViews],
        },
      );

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

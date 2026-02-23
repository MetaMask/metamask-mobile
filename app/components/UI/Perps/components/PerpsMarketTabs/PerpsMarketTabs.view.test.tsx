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
  renderPerpsView,
  defaultPositionForViews,
  defaultOrderForViews,
} from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import PerpsMarketTabs from './PerpsMarketTabs';
import { PerpsMarketTabsSelectorsIDs } from '../../Perps.testIds';
import React from 'react';

const MarketTabsDefault: React.FC = () => <PerpsMarketTabs symbol="ETH" />;
const MarketTabsStatistics: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="statistics" />
);
const MarketTabsPosition: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="position" />
);
const MarketTabsOrders: React.FC = () => (
  <PerpsMarketTabs symbol="ETH" initialTab="orders" />
);
const MarketTabsSOL: React.FC = () => <PerpsMarketTabs symbol="SOL" />;

describe('PerpsMarketTabs', () => {
  describe('tab navigation', () => {
    it('renders tab container with position, orders, and statistics tabs', async () => {
      renderPerpsView(MarketTabsDefault, 'MarketTabsTest', {
        streamOverrides: {
          positions: [defaultPositionForViews],
          orders: [defaultOrderForViews],
        },
      });

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
      renderPerpsView(MarketTabsDefault, 'MarketTabsTest', {
        streamOverrides: {
          positions: [defaultPositionForViews],
          orders: [],
        },
      });

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
      renderPerpsView(MarketTabsStatistics, 'MarketTabsTest', {
        streamOverrides: {
          positions: [defaultPositionForViews],
          orders: [defaultOrderForViews],
        },
      });

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('position tab with position data', () => {
    it('renders position card when a matching position exists in stream', async () => {
      renderPerpsView(MarketTabsPosition, 'MarketTabsTest', {
        streamOverrides: { positions: [defaultPositionForViews] },
      });

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.POSITION_CONTENT),
      ).toBeOnTheScreen();
    });
  });

  describe('orders tab with order data', () => {
    it('renders order card when orders exist for the symbol', async () => {
      renderPerpsView(MarketTabsOrders, 'MarketTabsTest', {
        streamOverrides: {
          positions: [],
          orders: [defaultOrderForViews],
        },
      });

      expect(
        await screen.findByTestId(PerpsMarketTabsSelectorsIDs.ORDERS_CONTENT),
      ).toBeOnTheScreen();
    });
  });

  describe('statistics-only view (no position)', () => {
    it('shows statistics when no position exists for the symbol', async () => {
      renderPerpsView(MarketTabsSOL, 'MarketTabsTest', {
        streamOverrides: { positions: [] },
      });

      expect(
        await screen.findByTestId(
          PerpsMarketTabsSelectorsIDs.STATISTICS_CONTENT,
        ),
      ).toBeOnTheScreen();
    });
  });
});

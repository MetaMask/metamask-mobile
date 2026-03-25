import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(
  (eventName: string) =>
    ({
      addProperties: (properties: Record<string, unknown>) => ({
        build: () => ({ category: eventName, properties }),
      }),
    }) as const,
);

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

let capturedOnVisible: (() => void) | null = null;
jest.mock('../../hooks/useViewportTracking', () => ({
  useViewportTracking: (onVisible: () => void) => {
    capturedOnVisible = onVisible;
    return {
      ref: { current: null },
      onLayout: jest.fn(),
    };
  },
}));

describe('MarketInsightsEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnVisible = null;
  });

  it('renders summary text and handles press', () => {
    const mockPress = jest.fn();

    const report = {
      asset: 'eth',
      headline: 'ETH rallies on ETF optimism',
      summary: 'ETF optimism and whale accumulation are driving momentum.',
      trends: [{ title: 'ETF optimism' }, { title: 'whale accumulation' }],
      sources: [{ name: 'CoinDesk', type: 'news', url: 'coindesk.com' }],
    };

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={report as never}
        timeAgo="3m ago"
        onPress={mockPress}
        caip19Id={'eip155:1/erc20:0xtest' as CaipAssetType}
        testID="market-insights-entry-card"
      />,
    );

    expect(
      getByText('ETF optimism and whale accumulation are driving momentum.'),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId('market-insights-entry-card'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('tracks Market Insights Card Scrolled to View when card becomes visible', () => {
    renderWithProvider(
      <MarketInsightsEntryCard
        report={
          {
            asset: 'eth',
            headline: 'ETH rallies',
            summary: 'Summary text',
            trends: [],
            sources: [],
          } as never
        }
        timeAgo="1m ago"
        onPress={jest.fn()}
        caip19Id={'eip155:1/erc20:0xtest' as CaipAssetType}
        testID="market-insights-entry-card"
      />,
    );

    expect(capturedOnVisible).toBeDefined();
    capturedOnVisible?.();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      expect.objectContaining({
        category: EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW,
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({
      category: expect.objectContaining({
        category: EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW,
      }),
      properties: {
        caip19: 'eip155:1/erc20:0xtest',
        asset_symbol: 'eth',
      },
    });
  });

  it('does not track visibility event when caip19Id is missing', () => {
    renderWithProvider(
      <MarketInsightsEntryCard
        report={
          {
            asset: 'eth',
            headline: 'ETH rallies',
            summary: 'Summary text',
            trends: [],
            sources: [],
          } as never
        }
        timeAgo="1m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    expect(capturedOnVisible).toBeDefined();
    capturedOnVisible?.();

    expect(mockCreateEventBuilder).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics');

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

jest.mock('../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: { MarketInsightsEntryCardLoad: 'MarketInsightsEntryCardLoad' },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockAnimatedGradientBorder = jest.fn<null, any>(() => null);
jest.mock('./AnimatedGradientBorder', () => ({
  AnimatedGradientBorder: (props: Record<string, unknown>) =>
    MockAnimatedGradientBorder(props),
}));

const mockReport = {
  headline: 'ETH rallies on ETF optimism',
  summary: 'ETF optimism and whale accumulation are driving momentum.',
  trends: [{ title: 'ETF optimism' }, { title: 'whale accumulation' }],
  sources: [{ name: 'CoinDesk', type: 'news', url: 'coindesk.com' }],
};

describe('MarketInsightsEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnVisible = null;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  it('renders summary text and handles press', () => {
    const mockPress = jest.fn();

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
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
            digestId: 'a8154c57-c665-449c-8bb5-fcaae96ef922',
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
    act(() => {
      capturedOnVisible?.();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: EVENT_NAME.MARKET_INSIGHTS_CARD_SCROLLED_TO_VIEW,
        properties: {
          caip19: 'eip155:1/erc20:0xtest',
          asset_symbol: 'eth',
          digest_id: 'a8154c57-c665-449c-8bb5-fcaae96ef922',
        },
      }),
    );
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
    act(() => {
      capturedOnVisible?.();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders the footer disclaimer and timeAgo', () => {
    const { getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="5h ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    expect(getByText(/5h ago/)).toBeOnTheScreen();
  });

  it('updates card dimensions on layout and skips redundant updates', async () => {
    MockAnimatedGradientBorder.mockClear();

    const { getByTestId } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    const pressable = getByTestId('market-insights-entry-card');
    const innerBox = pressable.children[0] as unknown as {
      props: { onLayout?: (e: unknown) => void };
    };

    const getDimensions = () => {
      const calls = MockAnimatedGradientBorder.mock.calls;
      const lastCall = calls[calls.length - 1];
      return (lastCall[0] as Record<string, unknown>).dimensions;
    };

    // Initial render has null dimensions
    expect(getDimensions()).toBeNull();

    // First layout sets dimensions
    const renderCountBefore = MockAnimatedGradientBorder.mock.calls.length;
    await act(() => {
      innerBox.props.onLayout?.({
        nativeEvent: { layout: { width: 350, height: 200 } },
      });
    });
    expect(getDimensions()).toEqual({ width: 350, height: 200 });

    // Same dimensions should not trigger a re-render
    const renderCountAfterFirst = MockAnimatedGradientBorder.mock.calls.length;
    await act(() => {
      innerBox.props.onLayout?.({
        nativeEvent: { layout: { width: 350, height: 200 } },
      });
    });
    expect(MockAnimatedGradientBorder.mock.calls.length).toBe(
      renderCountAfterFirst,
    );

    // Different dimensions should update
    await act(() => {
      innerBox.props.onLayout?.({
        nativeEvent: { layout: { width: 400, height: 250 } },
      });
    });
    expect(getDimensions()).toEqual({ width: 400, height: 250 });
  });
});

import React from 'react';
import { fireEvent, act, render } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import type { CaipAssetType } from '@metamask/utils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { createMockUseAnalyticsHook } from '../../../../../util/test/analyticsMock';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('@react-native-masked-view/masked-view', () =>
  jest.fn(
    ({
      children,
      maskElement,
    }: {
      children?: React.ReactNode;
      maskElement?: React.ReactNode;
    }) => [maskElement, children],
  ),
);

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

let capturedOnSlideStart: (() => void) | null = null;
jest.mock('./SlidingTextCarousel', () => {
  const { View, Text } = jest.requireActual('react-native');
  return ({
    texts,
    onSlideStart,
  }: {
    texts: string[];
    onSlideStart?: () => void;
  }) => {
    capturedOnSlideStart = onSlideStart ?? null;
    return (
      <View>
        <Text>{texts[0]}</Text>
      </View>
    );
  };
});

/**
 * Finds the first node whose `onLayout` is not a Jest mock (skips
 * `useViewportTracking`'s mocked `onLayout`) so card `handleLayout` can be fired.
 */
function findFirstNonMockOnLayoutNode(
  node: ReactTestInstance,
): ReactTestInstance {
  const onLayout = node.props?.onLayout as ((e: unknown) => void) | undefined;
  if (onLayout && !jest.isMockFunction(onLayout)) {
    return node;
  }
  const { children } = node;
  if (children == null) {
    throw new Error('No non-mock onLayout handler found under card root');
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    try {
      return findFirstNonMockOnLayoutNode(child as ReactTestInstance);
    } catch {
      // try next sibling
    }
  }
  throw new Error('No non-mock onLayout handler found under card root');
}

const mockReport = {
  headline: 'ETH rallies on ETF optimism',
  summary: 'ETF optimism and whale accumulation are driving momentum.',
  trends: [
    { title: 'ETF optimism', description: 'ETF inflows are driving demand.' },
    {
      title: 'Whale accumulation',
      description: 'Large holders keep accumulating.',
    },
  ],
  sources: [{ name: 'CoinDesk', type: 'news', url: 'coindesk.com' }],
};

describe('MarketInsightsEntryCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnVisible = null;
    capturedOnSlideStart = null;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
  });

  it('renders the title and first trend description', () => {
    const mockPress = jest.fn();

    const { getByTestId, getByText, getAllByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={mockPress}
        caip19Id={'eip155:1/erc20:0xtest' as CaipAssetType}
        testID="market-insights-entry-card"
      />,
    );

    // GradientText renders the label twice (mask + gradient child), so use getAllByText
    expect(getAllByText('Market insights').length).toBeGreaterThan(0);
    expect(getByText('ETF inflows are driving demand.')).toBeOnTheScreen();

    fireEvent.press(getByTestId('market-insights-entry-card'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });

  it('renders summary text when there are no trend descriptions', () => {
    const { getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={
          {
            ...mockReport,
            trends: [],
          } as never
        }
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    expect(
      getByText('ETF optimism and whale accumulation are driving momentum.'),
    ).toBeOnTheScreen();
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
    const layoutTarget = findFirstNonMockOnLayoutNode(
      pressable as unknown as ReactTestInstance,
    );

    const getDimensions = () => {
      const calls = MockAnimatedGradientBorder.mock.calls;
      const lastCall = calls[calls.length - 1];
      return (lastCall[0] as Record<string, unknown>).dimensions;
    };

    // Initial render has null dimensions
    expect(getDimensions()).toBeNull();

    // First layout sets dimensions
    await act(() => {
      layoutTarget.props.onLayout?.({
        nativeEvent: { layout: { width: 350, height: 200 } },
      });
    });
    expect(getDimensions()).toEqual({ width: 350, height: 200 });

    // Same dimensions should not trigger a re-render
    const renderCountAfterFirst = MockAnimatedGradientBorder.mock.calls.length;
    await act(() => {
      layoutTarget.props.onLayout?.({
        nativeEvent: { layout: { width: 350, height: 200 } },
      });
    });
    expect(MockAnimatedGradientBorder.mock.calls.length).toBe(
      renderCountAfterFirst,
    );

    // Different dimensions should update
    await act(() => {
      layoutTarget.props.onLayout?.({
        nativeEvent: { layout: { width: 400, height: 250 } },
      });
    });
    expect(getDimensions()).toEqual({ width: 400, height: 250 });
  });

  it('passes animationKey=0 initially and increments when the card becomes visible', () => {
    MockAnimatedGradientBorder.mockClear();

    renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    const getAnimationKey = () => {
      const calls = MockAnimatedGradientBorder.mock.calls;
      const lastCall = calls[calls.length - 1];
      return (lastCall[0] as Record<string, unknown>).animationKey;
    };

    expect(getAnimationKey()).toBe(0);

    act(() => {
      capturedOnVisible?.();
    });

    expect(getAnimationKey()).toBe(1);
  });

  it('calls onDisclaimerPress when the info button is pressed', () => {
    const onDisclaimerPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        onDisclaimerPress={onDisclaimerPress}
        testID="market-insights-entry-card"
      />,
    );

    fireEvent.press(getByTestId('market-insights-info-button'));

    expect(onDisclaimerPress).toHaveBeenCalledTimes(1);
  });

  it('increments the border animation key when a carousel slide starts', () => {
    MockAnimatedGradientBorder.mockClear();

    renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    const getAnimationKey = () => {
      const calls = MockAnimatedGradientBorder.mock.calls;
      const lastCall = calls[calls.length - 1];
      return (lastCall[0] as Record<string, unknown>).animationKey;
    };

    expect(getAnimationKey()).toBe(0);

    act(() => {
      capturedOnSlideStart?.();
    });

    expect(getAnimationKey()).toBe(1);
  });
});

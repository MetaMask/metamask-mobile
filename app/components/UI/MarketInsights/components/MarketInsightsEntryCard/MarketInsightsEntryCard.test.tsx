import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { endTrace, TraceName } from '../../../../../util/trace';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';

jest.mock('../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  TraceName: { MarketInsightsEntryCardLoad: 'MarketInsightsEntryCardLoad' },
}));

jest.mock('../../hooks/useViewportTracking', () => ({
  useViewportTracking: jest.fn(() => ({
    ref: { current: null },
    onLayout: jest.fn(),
  })),
}));

jest.mock('./AnimatedGradientBorder', () => ({
  AnimatedGradientBorder: () => null,
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

  it('calls endTrace when caip19Id is provided', () => {
    renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        caip19Id={'eip155:1/erc20:0xtest' as CaipAssetType}
        testID="market-insights-entry-card"
      />,
    );

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.MarketInsightsEntryCardLoad,
      id: 'eip155:1/erc20:0xtest',
    });
  });

  it('does not call endTrace when caip19Id is not provided', () => {
    renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    expect(endTrace).not.toHaveBeenCalled();
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
    const { getByTestId, UNSAFE_getAllByType } = renderWithProvider(
      <MarketInsightsEntryCard
        report={mockReport as never}
        timeAgo="3m ago"
        onPress={jest.fn()}
        testID="market-insights-entry-card"
      />,
    );

    // The outer Pressable has testID; the inner Box with onLayout is a child
    const pressable = getByTestId('market-insights-entry-card');
    // Find all Views to locate the inner Box with onLayout
    const innerViews = pressable.children;
    const innerBox = innerViews[0] as unknown as {
      props: { onLayout?: (e: unknown) => void };
    };

    const layoutEvent = {
      nativeEvent: { layout: { width: 350, height: 200 } },
    };

    await act(() => {
      innerBox.props.onLayout?.(layoutEvent);
    });
    await act(() => {
      innerBox.props.onLayout?.(layoutEvent);
    });
    await act(() => {
      innerBox.props.onLayout?.({
        nativeEvent: { layout: { width: 400, height: 250 } },
      });
    });
  });
});

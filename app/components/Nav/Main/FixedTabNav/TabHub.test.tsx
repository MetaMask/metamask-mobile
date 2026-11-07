import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabHub from './TabHub';
import FixedTabRow from './FixedTabRow';
import type { FixedHubTab } from './fixedTabNav.types';

const TrendingScreen = () => (
  <>
    <FixedTabRow />
    <Text>Trending screen</Text>
  </>
);
const PerpsScreen = () => (
  <>
    <FixedTabRow />
    <Text>Perps screen</Text>
  </>
);
const SwapsScreen = () => (
  <>
    <FixedTabRow />
    <Text>Swaps screen</Text>
  </>
);

const TRADE_TABS: readonly FixedHubTab[] = [
  { key: 'trending', label: 'Trending', Screen: TrendingScreen },
  { key: 'perps', label: 'Perps', Screen: PerpsScreen },
  { key: 'swaps', label: 'Swaps', Screen: SwapsScreen },
];

describe('TabHub', () => {
  it('opens the first tab and swaps content while the tab row stays', () => {
    const { getByText, getAllByText, getByTestId, queryByText } =
      renderWithProvider(<TabHub testID="fixed-tab-trade" tabs={TRADE_TABS} />);

    expect(getByText('Trending screen')).toBeOnTheScreen();
    expect(queryByText('Perps screen')).toBeNull();
    expect(getByTestId('fixed-tab-trade-tabs')).toBeOnTheScreen();

    fireEvent.press(getByTestId('fixed-tab-trade-tab-perps'));

    expect(getByText('Perps screen')).toBeOnTheScreen();
    expect(queryByText('Trending screen')).toBeNull();
    // Each Tab renders a hidden sizing label plus the visible one.
    expect(getAllByText('Trending').length).toBeGreaterThan(0);
    expect(getAllByText('Perps').length).toBeGreaterThan(0);
    expect(getAllByText('Swaps').length).toBeGreaterThan(0);
  });
});

import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PillHub from './PillHub';
import FixedTabPillRow from './FixedTabPillRow';
import type { FixedTabPill } from './fixedTabNav.types';

const TrendingScreen = () => (
  <>
    <FixedTabPillRow />
    <Text>Trending screen</Text>
  </>
);
const PerpsScreen = () => (
  <>
    <FixedTabPillRow />
    <Text>Perps screen</Text>
  </>
);
const SwapsScreen = () => (
  <>
    <FixedTabPillRow />
    <Text>Swaps screen</Text>
  </>
);

const TRADE_PILLS: readonly FixedTabPill[] = [
  { key: 'trending', label: 'Trending', Screen: TrendingScreen },
  { key: 'perps', label: 'Perps', Screen: PerpsScreen },
  { key: 'swaps', label: 'Swaps', Screen: SwapsScreen },
];

describe('PillHub', () => {
  it('opens the first pill and swaps content while the tab row stays', () => {
    const { getByText, getAllByText, getByTestId, queryByText } =
      renderWithProvider(
        <PillHub testID="fixed-tab-trade" pills={TRADE_PILLS} />,
      );

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

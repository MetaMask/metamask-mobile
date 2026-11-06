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
  it('opens the first pill and swaps content while the pill row stays', () => {
    const { getByText, getByTestId, queryByText } = renderWithProvider(
      <PillHub testID="fixed-tab-trade" pills={TRADE_PILLS} />,
    );

    expect(getByText('Trending screen')).toBeOnTheScreen();
    expect(queryByText('Perps screen')).toBeNull();
    expect(getByTestId('fixed-tab-trade-pills')).toBeOnTheScreen();

    fireEvent.press(getByTestId('fixed-tab-trade-pill-perps'));

    expect(getByText('Perps screen')).toBeOnTheScreen();
    expect(queryByText('Trending screen')).toBeNull();
    expect(getByText('Trending')).toBeOnTheScreen();
    expect(getByText('Perps')).toBeOnTheScreen();
    expect(getByText('Swaps')).toBeOnTheScreen();
  });
});

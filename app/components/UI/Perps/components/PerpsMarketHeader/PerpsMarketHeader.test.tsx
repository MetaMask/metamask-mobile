import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsMarketHeader from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketHeaderSelectorsIDs } from '../../Perps.testIds';
import { PerpsMarketData } from '@metamask/perps-controller';

jest.mock('../../providers/PerpsStreamManager');

const mockMarket: PerpsMarketData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  price: '$45,000.00',
  change24h: '+$1,125.00',
  change24hPercent: '+2.50%',
  volume: '$1.23B',
  maxLeverage: '40x',
};

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsMarketHeader', () => {
  it('renders correctly', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.CONTAINER)).toBeTruthy();
  });

  it('handles back button press', () => {
    const onBackPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onBackPress={onBackPress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketHeaderSelectorsIDs.BACK_BUTTON));
    expect(onBackPress).toHaveBeenCalled();
  });

  it('handles more button press', () => {
    const onMorePress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onMorePress={onMorePress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketHeaderSelectorsIDs.MORE_BUTTON));
    expect(onMorePress).toHaveBeenCalled();
  });

  it('renders correctly without maxLeverage', () => {
    const marketWithoutLeverage = {
      ...mockMarket,
      maxLeverage: undefined,
    };

    const { getByTestId, queryByText } = renderWithProvider(
      <PerpsMarketHeader
        market={marketWithoutLeverage as unknown as PerpsMarketData}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(queryByText('40x')).toBeNull();
  });
});

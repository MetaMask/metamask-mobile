import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import PerpsMarketHeader from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketHeaderSelectorsIDs } from '../../Perps.testIds';
import { PerpsMarketData } from '../../controllers/types';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';

// Mock PerpsStreamManager
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
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onBackPress={onBackPress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    // Find ButtonIcon by type and press it
    const backButton = UNSAFE_getByType(ButtonIcon);
    fireEvent.press(backButton);
    expect(onBackPress).toHaveBeenCalled();
  });

  it('handles more button press', () => {
    const onMorePress = jest.fn();
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onMorePress={onMorePress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    // Find TouchableOpacity for the more button
    const moreButton = UNSAFE_getByType(TouchableOpacity);
    fireEvent.press(moreButton);
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

    // Container should still render
    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.CONTAINER)).toBeTruthy();

    // Leverage badge should not be rendered when maxLeverage is undefined
    expect(queryByText('40x')).toBeNull();
  });
});

import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import PerpsMarketHeader from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketHeaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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
  it('should render correctly', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
      />,
      { state: initialState },
    );

    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.CONTAINER)).toBeTruthy();
  });

  it('should handle back button press', () => {
    const onBackPress = jest.fn();
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onBackPress={onBackPress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
      />,
      { state: initialState },
    );

    // Find ButtonIcon by type and press it
    const backButton = UNSAFE_getByType(ButtonIcon);
    fireEvent.press(backButton);
    expect(onBackPress).toHaveBeenCalled();
  });

  it('should handle more button press', () => {
    const onMorePress = jest.fn();
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsMarketHeader
        market={mockMarket}
        onMorePress={onMorePress}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
      />,
      { state: initialState },
    );

    // Find TouchableOpacity for the more button
    const moreButton = UNSAFE_getByType(TouchableOpacity);
    fireEvent.press(moreButton);
    expect(onMorePress).toHaveBeenCalled();
  });
});

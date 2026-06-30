import React from 'react';
import { Text } from '@metamask/design-system-react-native';
import { fireEvent } from '@testing-library/react-native';
import { PerpsMarketData } from '@metamask/perps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsMarketHeaderSelectorsIDs } from '../../Perps.testIds';
import { PerpsMarketInlineHeader } from './PerpsMarketInlineHeader';

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

describe('PerpsMarketInlineHeader', () => {
  it('renders market identity test IDs', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketInlineHeader
        market={mockMarket}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.CONTAINER)).toBeTruthy();
    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.ASSET_ICON)).toBeTruthy();
    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.ASSET_NAME)).toBeTruthy();
    expect(getByTestId(PerpsMarketHeaderSelectorsIDs.PRICE)).toBeTruthy();
    expect(
      getByTestId(PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE),
    ).toBeTruthy();
  });

  it('handles back button press', () => {
    const onBackPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketInlineHeader
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
      <PerpsMarketInlineHeader
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

  it('handles favorite and search button presses', () => {
    const onFavoritePress = jest.fn();
    const onCategorySearchPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketInlineHeader
        market={mockMarket}
        onFavoritePress={onFavoritePress}
        onCategorySearchPress={onCategorySearchPress}
        isFavorite
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON));
    fireEvent.press(
      getByTestId(PerpsMarketHeaderSelectorsIDs.CATEGORY_SEARCH_BUTTON),
    );

    expect(onFavoritePress).toHaveBeenCalled();
    expect(onCategorySearchPress).toHaveBeenCalled();
  });

  it('renders endAccessory when provided', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketInlineHeader
        market={mockMarket}
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
        endAccessory={<Text testID="custom-end-accessory">Grouping</Text>}
      />,
      { state: initialState },
    );

    expect(getByTestId('custom-end-accessory')).toBeTruthy();
  });

  it('renders without maxLeverage badge', () => {
    const marketWithoutLeverage = {
      ...mockMarket,
      maxLeverage: undefined,
    };

    const { getByTestId, queryByText } = renderWithProvider(
      <PerpsMarketInlineHeader
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

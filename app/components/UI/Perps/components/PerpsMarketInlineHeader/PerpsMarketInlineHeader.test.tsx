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

  it('handles favorite button press', () => {
    const onFavoritePress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketInlineHeader
        market={mockMarket}
        onFavoritePress={onFavoritePress}
        isFavorite
        testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
        currentPrice={45000}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId(PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON));

    expect(onFavoritePress).toHaveBeenCalled();
  });

  describe('useDetailLayout layout', () => {
    it('renders the full asset name as title and the market pair subtitle', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <PerpsMarketInlineHeader
          market={mockMarket}
          useDetailLayout
          testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
          currentPrice={45000}
        />,
        { state: initialState },
      );

      // Title shows the full asset name, subtitle shows the [ticker]-[collateral] perp pair
      expect(getByText('Bitcoin')).toBeTruthy();
      expect(getByTestId(PerpsMarketHeaderSelectorsIDs.SUBTITLE)).toBeTruthy();
      expect(getByText('BTC-USD perp')).toBeTruthy();

      // Price/24h change are not rendered inside the header in this layout
      expect(queryByTestId(PerpsMarketHeaderSelectorsIDs.PRICE)).toBeNull();
      expect(
        queryByTestId(PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE),
      ).toBeNull();
    });

    it('falls back to the ticker when the market has no name', () => {
      const marketWithoutName = {
        ...mockMarket,
        name: '',
      } as unknown as PerpsMarketData;

      const { getByText } = renderWithProvider(
        <PerpsMarketInlineHeader
          market={marketWithoutName}
          useDetailLayout
          testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
          currentPrice={45000}
        />,
        { state: initialState },
      );

      expect(getByText('BTC')).toBeTruthy();
    });

    it('handles the market list button press', () => {
      const onMarketListPress = jest.fn();
      const { getByTestId } = renderWithProvider(
        <PerpsMarketInlineHeader
          market={mockMarket}
          useDetailLayout
          onMarketListPress={onMarketListPress}
          testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
          currentPrice={45000}
        />,
        { state: initialState },
      );

      fireEvent.press(
        getByTestId(PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON),
      );

      expect(onMarketListPress).toHaveBeenCalled();
    });

    it('does not render the market list button without a handler', () => {
      const { queryByTestId } = renderWithProvider(
        <PerpsMarketInlineHeader
          market={mockMarket}
          useDetailLayout
          testID={PerpsMarketHeaderSelectorsIDs.CONTAINER}
          currentPrice={45000}
        />,
        { state: initialState },
      );

      expect(
        queryByTestId(PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON),
      ).toBeNull();
    });
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

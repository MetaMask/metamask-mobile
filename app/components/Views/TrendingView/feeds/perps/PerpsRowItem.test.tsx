import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import PerpsRowItem from './PerpsRowItem';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  NavigationProp: jest.fn(),
}));

jest.mock('../../../../UI/Perps/components/PerpsMarketRowItem', () => {
  const React = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    onPress,
    market,
  }: {
    onPress: () => void;
    market: { symbol: string };
  }) {
    return React.createElement(
      TouchableOpacity,
      { testID: `market-row-${market.symbol}`, onPress },
      React.createElement(Text, null, market.symbol),
    );
  };
});

const mockMarket = { symbol: 'BTC' } as never;

describe('PerpsRowItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates with source=explore and no source_section when sourceSection is not provided', () => {
    const { getByTestId } = render(<PerpsRowItem market={mockMarket} />);

    fireEvent.press(getByTestId('market-row-BTC'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        params: expect.objectContaining({
          source: PERPS_EVENT_VALUE.SOURCE.EXPLORE,
        }),
      }),
    );
    const params = mockNavigate.mock.calls[0][1].params;
    expect(params.source_section).toBeUndefined();
  });

  it('passes source_section when sourceSection prop is provided', () => {
    const { getByTestId } = render(
      <PerpsRowItem
        market={mockMarket}
        sourceSection={
          PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_STOCKS_COMMODITIES
        }
      />,
    );

    fireEvent.press(getByTestId('market-row-BTC'));

    const params = mockNavigate.mock.calls[0][1].params;
    expect(params.source).toBe(PERPS_EVENT_VALUE.SOURCE.EXPLORE);
    expect(params.source_section).toBe(
      PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_STOCKS_COMMODITIES,
    );
  });

  it('calls onCardPress before navigating', () => {
    const onCardPress = jest.fn();
    const { getByTestId } = render(
      <PerpsRowItem
        market={mockMarket}
        sourceSection={PERPS_EVENT_VALUE.SOURCE_SECTION.PERPS_MARKETS}
        onCardPress={onCardPress}
      />,
    );

    fireEvent.press(getByTestId('market-row-BTC'));

    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});

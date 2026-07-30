import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsMarketIdentity from './PerpsMarketIdentity';

jest.mock('../../providers/PerpsStreamManager');

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsMarketIdentity', () => {
  it('renders name, leverage, and perp subtitle', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        maxLeverage="40x"
        testIDs={{
          assetName: 'identity-name',
          subtitle: 'identity-subtitle',
        }}
      />,
      { state: initialState },
    );

    expect(getByTestId('identity-name')).toHaveTextContent('Bitcoin');
    expect(getByText('40x')).toBeOnTheScreen();
    expect(getByTestId('identity-subtitle')).toHaveTextContent('BTC-USD perp');
  });

  it('falls back to the display symbol when name is omitted', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="ETH"
        testIDs={{ assetName: 'identity-name' }}
      />,
      { state: initialState },
    );

    expect(getByTestId('identity-name')).toHaveTextContent('ETH');
  });

  it('fires onPress from the market-list pressable', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        onPress={onPress}
        testIDs={{ marketListButton: 'identity-pressable' }}
      />,
      { state: initialState },
    );

    fireEvent.press(getByTestId('identity-pressable'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a non-interactive identity when onPress is omitted', () => {
    const { queryByTestId, getByTestId } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        testIDs={{
          assetName: 'identity-name',
          marketListButton: 'identity-pressable',
        }}
      />,
      { state: initialState },
    );

    expect(queryByTestId('identity-pressable')).not.toBeOnTheScreen();
    expect(getByTestId('identity-name')).toBeOnTheScreen();
  });
});

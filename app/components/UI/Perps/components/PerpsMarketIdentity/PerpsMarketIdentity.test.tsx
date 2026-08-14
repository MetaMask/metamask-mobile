import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Icon, IconName, Text } from '@metamask/design-system-react-native';
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

  it('renders a down arrow when onPress is provided', () => {
    const { UNSAFE_getAllByType } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        onPress={jest.fn()}
        testIDs={{ marketListButton: 'identity-pressable' }}
      />,
      { state: initialState },
    );

    const icons = UNSAFE_getAllByType(Icon);
    const downArrow = icons.find(
      (icon) => icon.props.name === IconName.ArrowDown,
    );

    expect(downArrow).toBeDefined();
    expect(icons.some((icon) => icon.props.name === IconName.ArrowRight)).toBe(
      false,
    );
  });

  it('does not render a market-list arrow when onPress is omitted', () => {
    const { UNSAFE_queryAllByType } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        testIDs={{ assetName: 'identity-name' }}
      />,
      { state: initialState },
    );

    expect(UNSAFE_queryAllByType(Icon)).toHaveLength(0);
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

  it('renders subtitleContent instead of the default subtitle when provided', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsMarketIdentity
        symbol="BTC"
        name="Bitcoin"
        testIDs={{ subtitle: 'identity-subtitle' }}
        subtitleContent={<Text testID="custom-subtitle">$45,000</Text>}
      />,
      { state: initialState },
    );

    expect(getByTestId('custom-subtitle')).toHaveTextContent('$45,000');
    expect(queryByTestId('identity-subtitle')).not.toBeOnTheScreen();
  });
});

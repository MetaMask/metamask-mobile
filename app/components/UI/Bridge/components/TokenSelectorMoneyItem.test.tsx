import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TokenSelectorMoneyItem } from './TokenSelectorMoneyItem';
import { createMockToken } from '../testUtils/fixtures';

describe('TokenSelectorMoneyItem', () => {
  it('shows the money account row and apy', () => {
    const token = createMockToken({
      symbol: 'Money',
      name: 'MetaMask Money',
      isMoneyToken: true,
      apy: 6.2,
    });
    const onPress = jest.fn();

    const { getByText, getByTestId } = render(
      <TokenSelectorMoneyItem token={token} onPress={onPress} />,
    );

    expect(getByText('MetaMask Money')).toBeOnTheScreen();
    expect(getByText('Stablecoin account')).toBeOnTheScreen();
    expect(getByText('6.2% APY')).toBeOnTheScreen();
    expect(getByTestId('money-token-icon')).toBeOnTheScreen();
    expect(getByTestId('money-token-text')).toHaveStyle({
      alignItems: 'center',
    });

    fireEvent.press(getByTestId('asset-0x1-Money'));
    expect(onPress).toHaveBeenCalledWith(token);
  });

  it('shows the selected indicator when the money token is selected', () => {
    const token = createMockToken({
      symbol: 'Money',
      name: 'Stablecoin account',
      isMoneyToken: true,
    });

    const { getByTestId, queryByTestId, rerender } = render(
      <TokenSelectorMoneyItem token={token} onPress={jest.fn()} isSelected />,
    );

    expect(getByTestId('money-token-selected-indicator')).toBeOnTheScreen();

    rerender(<TokenSelectorMoneyItem token={token} onPress={jest.fn()} />);

    expect(
      queryByTestId('money-token-selected-indicator'),
    ).not.toBeOnTheScreen();
  });

  it('shows a positive balance above the apy', () => {
    const token = createMockToken({
      symbol: 'Money',
      name: 'Stablecoin account',
      isMoneyToken: true,
      apy: 6.2,
      balanceFiat: '$10.12',
    });

    const { getByTestId, queryByTestId, rerender } = render(
      <TokenSelectorMoneyItem token={token} onPress={jest.fn()} />,
    );

    expect(getByTestId('money-token-balance')).toHaveTextContent('$10.12');
    expect(getByTestId('money-token-apy')).toBeOnTheScreen();
    expect(getByTestId('money-token-text')).toHaveStyle({
      alignItems: 'flex-start',
    });

    rerender(
      <TokenSelectorMoneyItem
        token={{ ...token, balanceFiat: undefined }}
        onPress={jest.fn()}
      />,
    );

    expect(queryByTestId('money-token-balance')).not.toBeOnTheScreen();
    expect(getByTestId('money-token-text')).toHaveStyle({
      alignItems: 'center',
    });
  });

  it('keeps a non-dollar fiat balance string', () => {
    const token = createMockToken({
      symbol: 'Money',
      name: 'Stablecoin account',
      isMoneyToken: true,
      balanceFiat: '€10.12',
    });

    const { getByTestId } = render(
      <TokenSelectorMoneyItem token={token} onPress={jest.fn()} />,
    );

    expect(getByTestId('money-token-balance')).toHaveTextContent('€10.12');
  });
});

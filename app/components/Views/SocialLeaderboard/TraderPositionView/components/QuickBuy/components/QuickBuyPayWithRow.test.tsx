import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import QuickBuyPayWithRow from './QuickBuyPayWithRow';
import { getTokenKey } from '../sourceTokenCandidates';

const getRowTestId = (token: BridgeToken): string =>
  `quick-buy-pay-with-row-${getTokenKey(token)}`;

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  chainId: '0x1',
  balance: '10100.01',
  balanceFiat: '$10,100.01',
  isVerified: true,
  ...overrides,
});

describe('QuickBuyPayWithRow', () => {
  it('renders token name, symbol, and balances', () => {
    render(
      <QuickBuyPayWithRow
        token={createToken()}
        isSelected={false}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText('USD Coin')).toBeOnTheScreen();
    expect(screen.getByText('USDC')).toBeOnTheScreen();
    expect(screen.getByText('$10,100.01')).toBeOnTheScreen();
    expect(screen.getByText('10,100.01 USDC')).toBeOnTheScreen();
  });

  it('shows the verified icon when token.isVerified is true', () => {
    render(
      <QuickBuyPayWithRow
        token={createToken({ isVerified: true })}
        isSelected={false}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        `quick-buy-pay-with-verified-${getTokenKey(createToken())}`,
      ),
    ).toBeOnTheScreen();
  });

  it('hides the verified icon when token.isVerified is false', () => {
    render(
      <QuickBuyPayWithRow
        token={createToken({ isVerified: false })}
        isSelected={false}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId(
        `quick-buy-pay-with-verified-${getTokenKey(createToken({ isVerified: false }))}`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('invokes onPress with the token when the row is pressed', () => {
    const token = createToken({ symbol: 'USDT', name: 'Tether' });
    const onPress = jest.fn();

    render(
      <QuickBuyPayWithRow token={token} isSelected={false} onPress={onPress} />,
    );

    fireEvent.press(screen.getByTestId(getRowTestId(token)));
    expect(onPress).toHaveBeenCalledWith(token);
  });
});

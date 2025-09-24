import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AssetType } from '../../../types/token';
import { Token } from './token';

describe('Token', () => {
  const createMockToken = (overrides: Partial<AssetType> = {}): AssetType => ({
    address: '0x1234567890123456789012345678901234567890',
    balance: '100.5',
    chainId: '0x1',
    symbol: 'ETH',
    name: 'Ethereum',
    aggregators: [],
    decimals: 18,
    image: 'https://example.com/eth.png',
    logo: 'https://example.com/eth.png',
    isETH: true,
    ...overrides,
  });
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays ERC20 token with avatar', () => {
    const mockToken = createMockToken({
      isNative: false,
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1000.0',
      image: 'https://example.com/usdc.png',
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('USD Coin')).toBeOnTheScreen();
    expect(getByText('1000.0 USDC')).toBeOnTheScreen();
  });

  it('displays fallback name when name is missing', () => {
    const mockToken = createMockToken({
      name: undefined,
      symbol: 'TOKEN',
      balance: '50.0',
    });

    const { getByText, queryByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(queryByText('Ethereum')).not.toBeOnTheScreen();
    expect(getByText('50.0 TOKEN')).toBeOnTheScreen();
  });

  it('displays fallback symbol when both name and symbol are missing', () => {
    const mockToken = createMockToken({
      name: undefined,
      symbol: undefined,
      balance: '25.0',
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('Unknown Token')).toBeOnTheScreen();
    expect(getByText('25.0')).toBeOnTheScreen();
  });

  it('displays network badge when networkBadgeSource is provided', () => {
    const mockToken = createMockToken({
      networkBadgeSource: { uri: 'https://example.com/badge.png' },
      name: 'Polygon ETH',
      symbol: 'ETH',
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('Polygon ETH')).toBeOnTheScreen();
  });

  it('displays balance in selected currency when provided', () => {
    const mockToken = createMockToken({
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1000.0',
      balanceInSelectedCurrency: '$1,000.00',
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('$1,000.00')).toBeOnTheScreen();
    expect(getByText('1000.0 USDC')).toBeOnTheScreen();
  });

  it('does not display balance in selected currency when not provided', () => {
    const mockToken = createMockToken({
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1000.0',
      balanceInSelectedCurrency: undefined,
    });

    const { queryByText, getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(queryByText('$')).not.toBeOnTheScreen();
    expect(getByText('1000.0 USDC')).toBeOnTheScreen();
  });
});

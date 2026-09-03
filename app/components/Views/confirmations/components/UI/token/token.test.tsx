import React from 'react';
import { Text } from 'react-native';
import { BtcAccountType } from '@metamask/keyring-api';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AssetType } from '../../../types/token';
import { Token, TokenTagRenderer } from './token';
import { act, fireEvent } from '@testing-library/react-native';

jest.mock(
  '../../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => () => null,
);

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
    expect(getByText('1,000 USDC')).toBeOnTheScreen();
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
    expect(getByText('50 TOKEN')).toBeOnTheScreen();
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
    expect(getByText('25')).toBeOnTheScreen();
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
    expect(getByText('1,000 USDC')).toBeOnTheScreen();
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
    expect(getByText('1,000 USDC')).toBeOnTheScreen();
  });

  it('renders BTC account type label when account type is BTC', () => {
    const mockToken = createMockToken({
      accountType: BtcAccountType.P2wpkh,
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('Native SegWit')).toBeOnTheScreen();
  });

  it('renders disabled message when token is disabled', () => {
    const mockToken = createMockToken({
      disabled: true,
      disabledMessage: 'Disabled Test',
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(getByText('Disabled Test')).toBeOnTheScreen();
  });

  it('calls onPress when token is pressed', async () => {
    const mockToken = createMockToken();

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    await act(() => {
      fireEvent.press(getByText('ETH'));
    });

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockToken);
  });

  it('does not call onPress when token is disabled and pressed', async () => {
    const mockToken = createMockToken({
      disabled: true,
    });

    const { getByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    await act(() => {
      fireEvent.press(getByText('ETH'));
    });

    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders tag from first matching tagRenderer', () => {
    const mockToken = createMockToken({
      symbol: 'ETH',
      name: 'Ethereum',
    });

    const renderer: TokenTagRenderer = () =>
      React.createElement(Text, null, 'No fee');

    const { getByText } = renderWithProvider(
      <Token
        asset={mockToken}
        tagRenderers={[renderer]}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('No fee')).toBeOnTheScreen();
  });

  it('does not render tag when tagRenderers is empty', () => {
    const mockToken = createMockToken({
      symbol: 'ETH',
      name: 'Ethereum',
    });

    const { queryByText } = renderWithProvider(
      <Token asset={mockToken} tagRenderers={[]} onPress={mockOnPress} />,
    );

    expect(queryByText('No fee')).not.toBeOnTheScreen();
  });

  it('does not render tag when no tagRenderers provided', () => {
    const mockToken = createMockToken({
      symbol: 'ETH',
      name: 'Ethereum',
    });

    const { queryByText } = renderWithProvider(
      <Token asset={mockToken} onPress={mockOnPress} />,
    );

    expect(queryByText('No fee')).not.toBeOnTheScreen();
  });

  it('renders first non-null tag when multiple renderers provided', () => {
    const mockToken = createMockToken({
      symbol: 'ETH',
      name: 'Ethereum',
    });

    const nullRenderer: TokenTagRenderer = () => null;
    const tagRenderer: TokenTagRenderer = () =>
      React.createElement(Text, null, 'Winner');
    const lateRenderer: TokenTagRenderer = () =>
      React.createElement(Text, null, 'Loser');

    const { getByText, queryByText } = renderWithProvider(
      <Token
        asset={mockToken}
        tagRenderers={[nullRenderer, tagRenderer, lateRenderer]}
        onPress={mockOnPress}
      />,
    );

    expect(getByText('Winner')).toBeOnTheScreen();
    expect(queryByText('Loser')).not.toBeOnTheScreen();
  });
});
